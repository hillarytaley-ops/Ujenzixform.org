# 📦 Tracking Number Generation Workflow

## Overview
Tracking numbers are automatically generated when a delivery provider accepts a delivery request. The system uses a dual approach: **Frontend Service** and **Database Triggers** to ensure tracking numbers are created reliably.

---

## 🎯 Tracking Number Format

**Format**: `TRK-YYYYMMDD-XXXXX`

**Example**: `TRK-20260221-49C1F`

**Components**:
- **TRK**: Prefix indicating "Tracking"
- **YYYYMMDD**: Date when tracking number was generated (e.g., 20260221 = Feb 21, 2026)
- **XXXXX**: 5-character random alphanumeric code
  - Uses characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  - Excludes confusing characters: `0`, `O`, `1`, `I`

---

## 🔄 Complete Workflow

### **STEP 1: Builder Creates Delivery Request**

```
Builder Dashboard
    ↓
Creates delivery request
    ↓
delivery_requests table
    ├── status: 'pending'
    ├── provider_id: NULL
    └── tracking_number: NULL
```

**No tracking number yet** - Request is pending acceptance.

---

### **STEP 2: Delivery Provider Views & Accepts Request**

#### **2A. Frontend Acceptance (Primary Method)**

**Location**: `DeliveryNotifications.tsx`, `DeliveryRequestCard.tsx`, `useDataIsolation.ts`

**Flow**:
```
Provider clicks "Accept Delivery"
    ↓
handleAcceptDelivery() called
    ↓
trackingNumberService.generateTrackingNumber()
    ├── Gets current date: 20260221
    ├── Generates 5-char random code: 49C1F
    └── Returns: TRK-20260221-49C1F
    ↓
Updates delivery_requests table:
    ├── status: 'accepted'
    ├── provider_id: [provider's UUID]
    ├── tracking_number: 'TRK-20260221-49C1F'
    └── accepted_at: [timestamp]
```

**Code Location**: `src/services/TrackingNumberService.ts`
```typescript
generateTrackingNumber(): string {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  
  // Generate random 5-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `TRK-${dateStr}-${code}`;
}
```

#### **2B. Database Trigger (Backup Method)**

**Location**: `supabase/migrations/20260227_fix_delivery_accept_error.sql`

**Trigger**: `trigger_create_tracking_on_delivery_accept`
- **Event**: `BEFORE UPDATE` on `delivery_requests` table
- **Condition**: Status changes to `'accepted'` or `'assigned'` AND `provider_id` is NOT NULL

**Flow**:
```
UPDATE delivery_requests SET status='accepted', provider_id='...'
    ↓
BEFORE UPDATE trigger fires
    ↓
create_tracking_on_delivery_accept() function executes
    ├── Checks: NEW.status IN ('accepted', 'assigned')
    ├── Checks: OLD.status NOT IN ('accepted', 'assigned')
    ├── Checks: NEW.provider_id IS NOT NULL
    ↓
Generates tracking number:
    v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    ↓
Inserts into tracking_numbers table:
    ├── tracking_number: 'TRK-20260221-49C1F'
    ├── delivery_request_id: [request UUID]
    ├── builder_id: [builder UUID]
    ├── delivery_provider_id: [provider UUID]
    ├── supplier_id: [from purchase_order if exists]
    ├── status: 'accepted'
    ├── delivery_address: [from delivery_request]
    ├── materials_description: [from delivery_request]
    ├── provider_name: [from profiles table]
    ├── provider_phone: [from profiles table]
    └── accepted_at: NOW()
    ↓
Sets NEW.tracking_number := v_tracking_num
    ↓
UPDATE completes with tracking_number set
```

**Database Function**:
```sql
CREATE OR REPLACE FUNCTION public.create_tracking_on_delivery_accept()
RETURNS TRIGGER AS $$
DECLARE
    v_tracking_num TEXT;
    v_builder_user_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
    v_supplier_id UUID;
    v_delivery_address TEXT;
BEGIN
    -- Only create tracking when status changes to accepted/assigned
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Insert into tracking_numbers table
        INSERT INTO public.tracking_numbers (...)
        VALUES (v_tracking_num, ...);
        
        -- Set tracking_number on delivery_requests
        NEW.tracking_number := v_tracking_num;
    END IF;
    
    RETURN NEW;
END;
$$;
```

---

### **STEP 3: Tracking Number Reuse Logic**

**Scenario**: If a delivery request already has a tracking number (e.g., provider changed), the system **reuses** the existing tracking number.

**Code**: `TrackingNumberService.onProviderAcceptsDelivery()`
```typescript
if (existingRequest.tracking_number) {
  // Reuse existing tracking number
  trackingNumber = existingRequest.tracking_number;
  console.log(`Reusing existing tracking number: ${trackingNumber}`);
} else {
  // Generate new tracking number
  trackingNumber = this.generateTrackingNumber();
  isNew = true;
}
```

---

### **STEP 4: First-Come-First-Served Protection**

**Business Rule**: Only the **first provider** to accept gets the delivery.

**Implementation**:
1. **Frontend Check**: `TrackingNumberService.onProviderAcceptsDelivery()`
   ```typescript
   if (existingRequest.status === 'accepted' && 
       existingRequest.provider_id && 
       existingRequest.provider_id !== providerId) {
     throw new Error('This delivery has already been accepted by another provider. First-come-first-served!');
   }
   ```

2. **Atomic Database Update**: Uses conditional update
   ```typescript
   .update({ status: 'accepted', provider_id: providerId, ... })
   .eq('id', deliveryRequestId)
   .or('status.eq.pending,status.eq.assigned')
   ```

---

### **STEP 5: Date-Based Scheduling**

**Business Rule**: Provider can only have **ONE active delivery per day**, but can accept **future deliveries** while having active deliveries today.

**Implementation**: `TrackingNumberService.onProviderAcceptsDelivery()`
```typescript
// Check if provider has active delivery for the SAME DATE
const requestDeliveryDate = requestToAccept.delivery_date 
  || requestToAccept.expected_delivery_date 
  || requestToAccept.pickup_date 
  || todayStr;

// Only block if dates match
if (activeDateStr === requestDateStr) {
  throw new Error(`You already have an active delivery scheduled for ${requestDateStr}`);
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DELIVERY REQUEST CREATED                 │
│  delivery_requests table                                    │
│  ├── status: 'pending'                                      │
│  ├── provider_id: NULL                                     │
│  └── tracking_number: NULL                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              PROVIDER ACCEPTS DELIVERY REQUEST              │
│                                                              │
│  Method 1: Frontend (Primary)                               │
│  ├── DeliveryNotifications.tsx                              │
│  ├── DeliveryRequestCard.tsx                                │
│  └── useDataIsolation.ts                                    │
│      │                                                       │
│      └─► trackingNumberService.generateTrackingNumber()     │
│          ├── Date: 20260221                                  │
│          ├── Random: 49C1F                                   │
│          └── Returns: TRK-20260221-49C1F                    │
│                                                              │
│  Method 2: Database Trigger (Backup)                       │
│  ├── trigger_create_tracking_on_delivery_accept             │
│  └── create_tracking_on_delivery_accept() function          │
│      ├── Generates: TRK-YYYYMMDD-XXXXX                      │
│      └── Inserts into tracking_numbers table                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE UPDATES                          │
│                                                              │
│  delivery_requests table:                                    │
│  ├── status: 'accepted'                                      │
│  ├── provider_id: [provider UUID]                           │
│  ├── tracking_number: 'TRK-20260221-49C1F'                 │
│  └── accepted_at: [timestamp]                               │
│                                                              │
│  tracking_numbers table (NEW ROW):                          │
│  ├── tracking_number: 'TRK-20260221-49C1F'                 │
│  ├── delivery_request_id: [request UUID]                     │
│  ├── builder_id: [builder UUID]                             │
│  ├── delivery_provider_id: [provider UUID]                   │
│  ├── supplier_id: [from purchase_order]                     │
│  ├── status: 'accepted'                                      │
│  ├── delivery_address: [address]                             │
│  ├── materials_description: [description]                   │
│  ├── provider_name: [from profiles]                        │
│  ├── provider_phone: [from profiles]                        │
│  └── accepted_at: [timestamp]                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BUILDER NOTIFIED & CAN TRACK                   │
│                                                              │
│  Builder Dashboard:                                         │
│  ├── TrackingTab component displays tracking number         │
│  ├── Real-time status updates                               │
│  └── Location tracking (if GPS enabled)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Components

### **1. Frontend Service**
- **File**: `src/services/TrackingNumberService.ts`
- **Method**: `generateTrackingNumber()`
- **Usage**: Called when provider accepts delivery in UI
- **Format**: `TRK-YYYYMMDD-XXXXX` (5-char random code)

### **2. Database Function**
- **File**: `supabase/migrations/20260227_fix_delivery_accept_error.sql`
- **Function**: `create_tracking_on_delivery_accept()`
- **Format**: `TRK-YYYYMMDD-XXXXX` (5-char MD5 hash)
- **Purpose**: Backup method if frontend doesn't set tracking number

### **3. Database Trigger**
- **Trigger**: `trigger_create_tracking_on_delivery_accept`
- **Event**: `BEFORE UPDATE` on `delivery_requests`
- **Condition**: Status changes to `'accepted'` or `'assigned'`

### **4. Tracking Numbers Table**
- **Table**: `tracking_numbers`
- **Purpose**: Centralized tracking number storage
- **Relationships**:
  - `delivery_request_id` → `delivery_requests.id`
  - `builder_id` → `auth.users.id`
  - `delivery_provider_id` → `auth.users.id`
  - `supplier_id` → `suppliers.id` (optional)

---

## ✅ Validation & Safety Checks

1. **First-Come-First-Served**: Prevents multiple providers from accepting the same delivery
2. **Date-Based Scheduling**: Prevents provider from accepting multiple deliveries on the same day
3. **Tracking Number Reuse**: If tracking number exists, it's reused (provider reassignment scenario)
4. **Atomic Updates**: Database ensures only one provider can successfully accept
5. **Dual Generation**: Both frontend and database can generate tracking numbers (redundancy)

---

## 🚨 Error Handling

1. **Already Accepted**: Error thrown if another provider already accepted
2. **Invalid Status**: Error thrown if delivery is not in `'pending'` or `'assigned'` status
3. **Date Conflict**: Error thrown if provider already has active delivery for same date
4. **Database Errors**: Trigger catches exceptions and logs warnings without failing the update

---

## 📝 Summary

**Tracking numbers are generated automatically when:**
1. ✅ Delivery provider accepts a delivery request
2. ✅ Status changes from `'pending'` to `'accepted'` or `'assigned'`
3. ✅ `provider_id` is set on the delivery request

**Generation happens in two ways:**
1. **Frontend** (Primary): `TrackingNumberService.generateTrackingNumber()`
2. **Database Trigger** (Backup): `create_tracking_on_delivery_accept()` function

**Result:**
- Tracking number stored in `delivery_requests.tracking_number`
- Tracking record created in `tracking_numbers` table
- Builder can track delivery using the tracking number
- Real-time status updates available

---

**Last Updated**: March 1, 2026
**Format Version**: `TRK-YYYYMMDD-XXXXX` (5-character random code)
