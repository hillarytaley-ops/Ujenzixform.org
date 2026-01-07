# 📦 Dispatch Scanning Roles - CLARIFIED

**Who Scans What and When in the MradiPro System**

---

## 🎯 Overview

The MradiPro scanning system involves **three different parties** scanning at **different stages**:

1. **Supplier/Warehouse Staff** - Scans during DISPATCH (loading)
2. **Driver** - Transports (does NOT scan during loading)
3. **Builder/Site Staff** - Scans during RECEIVING (offloading)

---

## 📋 Complete Scanning Workflow

```
┌──────────────────────────────────────────────────────────────┐
│          COMPLETE SCANNING WORKFLOW BY ROLE                  │
└──────────────────────────────────────────────────────────────┘

PHASE 1: ORDER PLACEMENT
════════════════════════
Builder places order
         │
         ↓
System auto-generates QR codes:
  ├─► Master Order QR
  ├─► Individual Item QRs (one per item)
  └─► Delivery Note QR
         │
         ↓
QR codes saved to database
Supplier receives order + QR codes


PHASE 2: DISPATCH SCANNING (SUPPLIER'S RESPONSIBILITY)
══════════════════════════════════════════════════════

Location: Supplier's Warehouse
Who: Supplier/Warehouse Staff
When: During loading onto vehicle
Tool: MradiPro Dispatch Scanner

┌─────────────────────────────────────────────────────────┐
│  SUPPLIER/WAREHOUSE STAFF WORKFLOW                      │
└─────────────────────────────────────────────────────────┘

STEP 1: Prepare Order
─────────────────────
Supplier warehouse staff:
  • Picks items from inventory
  • Verifies quantities
  • Checks quality
  • Prints QR labels
  • Attaches labels to packages
         │
         ↓

STEP 2: Driver Arrives
─────────────────────
Driver arrives with vehicle
Supplier coordinates loading
         │
         ↓

STEP 3: SUPPLIER SCANS DURING LOADING
──────────────────────────────────────
👤 SUPPLIER/WAREHOUSE STAFF opens scanner app
         │
         ↓
Scans Dispatch Note QR
         │
         ↓
Loading checklist appears:
  ☐ Item #1: Cement 50kg - 100 bags
  ☐ Item #2: Steel Bars - 200 pcs
  ☐ Item #3: Building Sand - 10 tonnes
         │
         ↓
For EACH item being loaded:
         │
         ├─► 👤 SUPPLIER scans item QR code
         ├─► System verifies item belongs to order
         ├─► Confirms quantity
         ├─► Records condition (good/damaged)
         ├─► Takes photo of item
         └─► Marks as "loaded" in system
         │
         ↓
All items scanned ✓
         │
         ↓
System records:
  • Item IDs scanned
  • Scanned by: SUPPLIER user ID
  • Timestamp
  • Photos
  • Condition notes
  • Vehicle details
         │
         ↓
Driver signature:
  • Driver CONFIRMS receipt of items
  • Driver does NOT do scanning
  • Driver just signs off that items received
         │
         ↓
Status updated: DISPATCHED
GPS tracking activated
Builder notified


PHASE 3: IN TRANSIT (NO SCANNING)
══════════════════════════════════

Location: On the road
Who: Driver
What: GPS tracking only (NO SCANNING)

Driver's responsibilities:
  • Safe transport
  • Follow GPS route
  • Update ETA if delayed
  • Contact builder if needed
         │
         ↓
Driver does NOT scan anything during transit


PHASE 4: RECEIVING SCANNING (BUILDER'S RESPONSIBILITY)
═══════════════════════════════════════════════════════

Location: Construction Site / Delivery Location
Who: Builder/Site Staff
When: During offloading from vehicle
Tool: MradiPro Receiving Scanner

┌─────────────────────────────────────────────────────────┐
│  BUILDER/SITE STAFF WORKFLOW                            │
└─────────────────────────────────────────────────────────┘

STEP 1: Delivery Arrives
────────────────────────
Driver arrives at site
System notifies builder:
"Your delivery has arrived!"
         │
         ↓

STEP 2: BUILDER SCANS DURING OFFLOADING
────────────────────────────────────────
👤 BUILDER/SITE STAFF opens scanner app
         │
         ↓
Scans Dispatch Note QR
         │
         ↓
Offloading checklist appears:
  ☐ Item #1: Cement 50kg - 100 bags
  ☐ Item #2: Steel Bars - 200 pcs
  ☐ Item #3: Building Sand - 10 tonnes
         │
         ↓
For EACH item being offloaded:
         │
         ├─► 👤 BUILDER scans item QR code
         ├─► System verifies item
         ├─► Builder confirms quantity received
         ├─► Builder inspects condition
         ├─► Takes photo of delivered item
         └─► Marks as "received" in system
         │
         ↓
All items scanned ✓
         │
         ↓
System records:
  • Item IDs received
  • Scanned by: BUILDER user ID
  • Timestamp
  • Photos
  • Condition assessment
  • Delivery location GPS
         │
         ↓
Builder signature:
  • Builder CONFIRMS receipt
  • Builder ACCEPTS delivery
  • Digital signature captured
         │
         ↓
Status updated: DELIVERED
Receipt generated
All parties notified
```

---

## 👥 Role Responsibilities Matrix

| Stage | Location | Who Scans | What They Scan | Purpose | Scanner App |
|-------|----------|-----------|----------------|---------|-------------|
| **Dispatch** | Supplier Warehouse | 👤 **Supplier/Warehouse Staff** | Item QR codes | Verify items loaded | Dispatch Scanner |
| **Transit** | On the road | ❌ No one | Nothing | GPS tracking only | N/A |
| **Receiving** | Delivery Site | 👤 **Builder/Site Staff** | Item QR codes | Verify items received | Receiving Scanner |

---

## 🔐 Access Control

### **Dispatch Scanner Access:**
```typescript
// File: src/components/qr/DispatchScanner.tsx
// Only accessible to:
- ✅ Suppliers (user_role = 'supplier')
- ✅ Admins (user_role = 'admin')
- ❌ Builders (cannot access)
- ❌ Drivers (cannot access)
```

### **Receiving Scanner Access:**
```typescript
// File: src/components/qr/ReceivingScanner.tsx
// Only accessible to:
- ✅ Builders (user_role = 'builder')
- ✅ Site Staff (user_role = 'builder')
- ✅ Admins (user_role = 'admin')
- ❌ Suppliers (cannot access)
- ❌ Drivers (cannot access)
```

---

## 📊 Database Schema Clarification

### **qr_scan_events Table:**

```sql
CREATE TABLE qr_scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code VARCHAR(255) NOT NULL,
  scan_type VARCHAR(50) NOT NULL,  -- 'dispatch', 'receiving', 'verification'
  scanned_by UUID REFERENCES auth.users(id),  -- Who scanned (Supplier or Builder)
  scanner_device_id TEXT,
  scanner_type VARCHAR(50),
  scan_location POINT,  -- GPS coordinates
  material_condition VARCHAR(50) DEFAULT 'good',
  quantity_scanned DECIMAL,
  notes TEXT,
  photo_url TEXT,
  scanned_at TIMESTAMP DEFAULT NOW()
);
```

### **Who's in scanned_by Field:**

| scan_type | scanned_by | Role |
|-----------|------------|------|
| `'dispatch'` | Supplier user_id | Supplier/Warehouse Staff |
| `'receiving'` | Builder user_id | Builder/Site Staff |
| `'verification'` | Admin user_id | Admin (optional verification) |

---

## 🔄 Updated Workflow Summary

### **1. Dispatch Phase (At Warehouse)**

```
┌─────────────────────────────────────┐
│  SUPPLIER'S SCANNING WORKFLOW       │
└─────────────────────────────────────┘

1. Order confirmed
2. Supplier picks items
3. 👤 SUPPLIER scans each item QR
   └─► Uses: DispatchScanner component
4. System records:
   └─► scanned_by: supplier_user_id
   └─► scan_type: 'dispatch'
   └─► status: 'dispatched'
5. Driver arrives
6. Driver signs CONFIRMING receipt
   └─► Driver does NOT scan
7. Items loaded onto vehicle
8. GPS tracking starts
```

### **2. Transit Phase (On Road)**

```
┌─────────────────────────────────────┐
│  DRIVER'S TRANSPORT WORKFLOW        │
└─────────────────────────────────────┘

1. Driver transports materials
2. GPS tracking active
3. ❌ NO scanning required
4. Driver focused on safe delivery
5. Builder tracks on /tracking page
```

### **3. Receiving Phase (At Site)**

```
┌─────────────────────────────────────┐
│  BUILDER'S SCANNING WORKFLOW        │
└─────────────────────────────────────┘

1. Driver arrives at site
2. Builder notified
3. 👤 BUILDER scans each item QR
   └─► Uses: ReceivingScanner component
4. System records:
   └─► scanned_by: builder_user_id
   └─► scan_type: 'receiving'
   └─► status: 'received'
5. Builder verifies quantities
6. Builder checks condition
7. Builder signs CONFIRMING acceptance
8. Receipt generated
```

---

## ✅ Current System Status

### **Frontend Components:**

1. **DispatchScanner.tsx** ✅
   - Already configured for SUPPLIER use
   - Access control: Suppliers + Admins only
   - Scan type: 'dispatch'
   - Location: Warehouse

2. **ReceivingScanner.tsx** ✅
   - Already configured for BUILDER use
   - Access control: Builders + Admins only
   - Scan type: 'receiving'
   - Location: Delivery site

3. **Role-based access** ✅
   - checkAuth() verifies user role
   - Scanner access based on role
   - Prevents unauthorized scanning

### **Backend (Supabase):**

1. **record_qr_scan Function** ✅
   - Records who scanned (auth.uid())
   - Tracks scan type (dispatch/receiving)
   - Validates permissions
   - Audit trail complete

2. **Database Tables** ✅
   - qr_scan_events: Records all scans with user ID
   - material_items: Tracks status changes
   - Proper foreign key relationships

---

## 🔧 What Needs Documentation Update

The **code is already correct**! Only the **documentation** had confusing wording suggesting drivers do dispatch scanning.

### **Documentation Updated:**

1. ✅ `MRADIPRO_COMPLETE_APP_WORKFLOW.md` - Fixed supplier workflow
2. ✅ `MRADIPRO_SCANNER_WORKFLOW.md` - Clarified scanning roles
3. 📄 `DISPATCH_SCANNING_ROLES_CLARIFIED.md` - This document

### **Code Status:**

- ✅ Frontend components already correct
- ✅ Backend functions already correct
- ✅ Access control already correct
- ✅ Database schema already correct

**NO CODE CHANGES NEEDED!** The system was already implemented correctly.

---

## 📝 Correct Terminology Going Forward

### **DISPATCH/LOADING (At Warehouse):**
- ✅ "Supplier scans items during loading"
- ✅ "Warehouse staff scans QR codes"
- ✅ "Supplier dispatches order"
- ❌ ~~"Driver scans during loading"~~ INCORRECT
- ❌ ~~"Driver scans at warehouse"~~ INCORRECT

### **RECEIVING/OFFLOADING (At Site):**
- ✅ "Builder scans items during offloading"
- ✅ "Site staff scans QR codes"
- ✅ "Builder receives delivery"
- ❌ ~~"Driver scans at delivery"~~ INCORRECT
- ❌ ~~"Driver scans during offloading"~~ INCORRECT

### **DRIVER'S ROLE:**
- ✅ "Driver transports materials"
- ✅ "Driver signs to confirm receipt from supplier"
- ✅ "Driver delivers to site"
- ✅ "GPS tracking during transit"
- ❌ Driver does NOT scan QR codes

---

## 🎯 Summary

### **The Correct Flow:**

```
SUPPLIER SCANS        DRIVER TRANSPORTS      BUILDER SCANS
(Dispatch)            (No Scanning)          (Receiving)
────────────          ─────────────          ──────────────

At Warehouse          On the Road            At Site
│                     │                      │
├─ Supplier opens     ├─ Driver drives       ├─ Builder opens
│  scanner            │                      │  scanner
│                     │                      │
├─ Scans each item    ├─ GPS tracking        ├─ Scans each item
│                     │  active              │
│                     │                      │
├─ Marks as           ├─ No scanning         ├─ Marks as
│  'dispatched'       │  required            │  'received'
│                     │                      │
└─ Driver signs       └─ Safe delivery       └─ Builder signs
   (confirms          focus                     (confirms
    receipt)                                     acceptance)
```

---

## 🔍 Why This Design?

### **Why Supplier Scans at Dispatch:**
1. ✅ Supplier knows their inventory
2. ✅ Supplier verifies correct items picked
3. ✅ Supplier ensures quality before sending
4. ✅ Supplier takes responsibility for what's loaded
5. ✅ Creates accountability for supplier

### **Why Driver Doesn't Scan:**
1. ✅ Driver focuses on safe transport
2. ✅ Simpler workflow for drivers
3. ✅ Faster loading process
4. ✅ Less training required for drivers
5. ✅ Reduces errors from non-warehouse staff

### **Why Builder Scans at Receiving:**
1. ✅ Builder verifies what arrived
2. ✅ Builder checks quantities match order
3. ✅ Builder inspects condition
4. ✅ Builder takes responsibility for acceptance
5. ✅ Creates proof of delivery for builder

---

## 💻 Code Implementation (Already Correct!)

### **Dispatch Scanner Component:**

```typescript
// File: src/components/qr/DispatchScanner.tsx

export const DispatchScanner: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setUserRole(roleData?.role || null);
  };
  
  const processQRScan = async (qrCode: string) => {
    // Records scan with current user (supplier)
    const { data, error } = await supabase.rpc('record_qr_scan', {
      _qr_code: qrCode,
      _scan_type: 'dispatch',  // Dispatch type
      // ... other params
    });
    // Scanned_by is automatically set to auth.uid() (the supplier)
  };
  
  // Only show scanner if user is supplier or admin
  if (userRole !== 'supplier' && userRole !== 'admin') {
    return <div>Access denied. Dispatch scanning is for suppliers only.</div>;
  }
  
  return (
    // Scanner UI for supplier/warehouse staff
  );
};
```

### **Receiving Scanner Component:**

```typescript
// File: src/components/qr/ReceivingScanner.tsx

export const ReceivingScanner: React.FC = () => {
  // Similar structure but for builders
  
  const processQRScan = async (qrCode: string) => {
    const { data, error } = await supabase.rpc('record_qr_scan', {
      _qr_code: qrCode,
      _scan_type: 'receiving',  // Receiving type
      // ... other params
    });
    // Scanned_by is automatically set to auth.uid() (the builder)
  };
  
  // Only show scanner if user is builder or admin
  if (userRole !== 'builder' && userRole !== 'admin') {
    return <div>Access denied. Receiving scanning is for builders only.</div>;
  }
  
  return (
    // Scanner UI for builders/site staff
  );
};
```

### **Database Function:**

```sql
-- File: supabase/migrations/...sql

CREATE OR REPLACE FUNCTION record_qr_scan(
  _qr_code VARCHAR,
  _scan_type VARCHAR,  -- 'dispatch' or 'receiving'
  _scanner_device_id TEXT,
  _scanner_type VARCHAR,
  _material_condition VARCHAR DEFAULT 'good',
  _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scan_event_id UUID;
BEGIN
  -- Insert scan event with current user
  INSERT INTO qr_scan_events (
    qr_code,
    scan_type,
    scanned_by,  -- Automatically uses auth.uid()
    -- This will be:
    -- - Supplier ID when scan_type = 'dispatch'
    -- - Builder ID when scan_type = 'receiving'
    ...
  ) VALUES (
    _qr_code,
    _scan_type,
    auth.uid(),  -- Current authenticated user
    ...
  );
  
  -- Update material status based on scan type
  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id
    WHERE qr_code = _qr_code;
    
  ELSIF _scan_type = 'receiving' THEN
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id
    WHERE qr_code = _qr_code;
  END IF;
  
  RETURN success response;
END;
$$;
```

---

## 📱 Scanner Apps

### **For Suppliers (Dispatch Scanner):**

**Access:** `/scanners?mode=dispatch` or Supplier Dashboard

**Features:**
- ✅ Scan items during loading
- ✅ Record condition
- ✅ Take photos
- ✅ Add notes
- ✅ Mark as dispatched
- ✅ Generate dispatch note

**User Interface:**
```
┌─────────────────────────────────────┐
│  DISPATCH SCANNER                   │
│  (Supplier/Warehouse Staff)         │
├─────────────────────────────────────┤
│                                     │
│  Order: PO-2024-156                 │
│  Items to Dispatch: 3               │
│  Scanned: 0/3                       │
│                                     │
│  [📷 Scan QR Code]                  │
│                                     │
│  Condition:                         │
│  ● Good  ○ Damaged  ○ Missing       │
│                                     │
│  Notes: [Optional...]               │
│                                     │
│  [Confirm Dispatch]                 │
└─────────────────────────────────────┘
```

---

### **For Builders (Receiving Scanner):**

**Access:** `/scanners?mode=receiving` or Builder Dashboard

**Features:**
- ✅ Scan items during offloading
- ✅ Verify quantities
- ✅ Inspect condition
- ✅ Take photos
- ✅ Add notes
- ✅ Mark as received

**User Interface:**
```
┌─────────────────────────────────────┐
│  RECEIVING SCANNER                  │
│  (Builder/Site Staff)               │
├─────────────────────────────────────┤
│                                     │
│  Order: PO-2024-156                 │
│  Items to Receive: 3                │
│  Scanned: 0/3                       │
│                                     │
│  [📷 Scan QR Code]                  │
│                                     │
│  Condition:                         │
│  ● Good  ○ Damaged  ○ Shortage      │
│                                     │
│  Notes: [Any issues...]             │
│                                     │
│  [Confirm Receipt]                  │
└─────────────────────────────────────┘
```

---

## ✅ System Validation

### **Access Control Checks:**

```typescript
// Dispatch Scanner (for suppliers)
if (userRole !== 'supplier' && userRole !== 'admin') {
  return <AccessDenied message="Dispatch scanning is for suppliers only" />;
}

// Receiving Scanner (for builders)
if (userRole !== 'builder' && userRole !== 'admin') {
  return <AccessDenied message="Receiving scanning is for builders only" />;
}
```

### **Database Validation:**

```sql
-- Row Level Security (RLS) Policy for qr_scan_events

-- Dispatch scans: Only suppliers can create
CREATE POLICY "Suppliers can record dispatch scans"
ON qr_scan_events FOR INSERT
TO authenticated
WITH CHECK (
  scan_type = 'dispatch' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('supplier', 'admin')
  )
);

-- Receiving scans: Only builders can create
CREATE POLICY "Builders can record receiving scans"
ON qr_scan_events FOR INSERT
TO authenticated
WITH CHECK (
  scan_type = 'receiving' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('builder', 'admin')
  )
);
```

---

## 🎊 Summary

### **Current System (Correct!):**

✅ **Dispatch Scanning:** Supplier/Warehouse Staff  
✅ **Receiving Scanning:** Builder/Site Staff  
✅ **Driver Role:** Transport only (NO scanning)  
✅ **Access Control:** Role-based, enforced  
✅ **Database:** Proper tracking of who scanned  
✅ **Audit Trail:** Complete scan history  

### **Documentation Updated:**

✅ Workflow diagrams clarified  
✅ Scanner workflow document updated  
✅ Role responsibilities clearly defined  
✅ No more confusion about who scans when  

### **No Code Changes Needed:**

The implementation was already correct! Only documentation needed clarification.

---

## 📞 Quick Reference

**During Dispatch (Loading):**
- 👤 WHO: Supplier/Warehouse Staff
- 📍 WHERE: Supplier Warehouse
- 📱 TOOL: Dispatch Scanner
- ✅ ACTION: Scan items being loaded

**During Transit:**
- 👤 WHO: Driver
- 📍 WHERE: On the road
- 📱 TOOL: GPS Tracking
- ❌ ACTION: NO scanning

**During Receiving (Offloading):**
- 👤 WHO: Builder/Site Staff
- 📍 WHERE: Construction Site
- 📱 TOOL: Receiving Scanner
- ✅ ACTION: Scan items being received

---

**🏗️ MradiPro - Roles Clarified, Scanning Streamlined! ✅**

---

*Last Updated: November 23, 2025*  
*Status: Documentation Clarified ✅*  
*Code: Already Correct, No Changes Needed 🎉*
















