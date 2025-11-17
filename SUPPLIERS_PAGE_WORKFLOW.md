# 🇰🇪 UjenziPro Suppliers Page - Complete Workflow Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Roles & Access Levels](#user-roles--access-levels)
3. [Page Features & Tabs](#page-features--tabs)
4. [Workflow Diagrams](#workflow-diagrams)
5. [Authentication Flow](#authentication-flow)
6. [Purchase Workflows](#purchase-workflows)
7. [Supplier Workflows](#supplier-workflows)
8. [Admin Workflows](#admin-workflows)
9. [Technical Implementation](#technical-implementation)

---

## 🎯 Overview

The **Suppliers Page** (`/suppliers`) is the central marketplace hub for UjenziPro, connecting:
- **Professional Builders** - Request quotes for construction projects
- **Private Clients** - Purchase materials directly
- **Suppliers** - Manage products, orders, and deliveries
- **Admins** - Oversee the entire marketplace

**URL:** `https://ujenzipro.com/suppliers`

---

## 👥 User Roles & Access Levels

### 1. **Guest Users (Not Logged In)**
**Access:**
- ✅ View suppliers directory
- ✅ Browse materials marketplace
- ✅ See product prices and availability
- ❌ Cannot request quotes
- ❌ Cannot purchase items

**Actions Available:**
- Browse materials catalog
- View supplier information
- Sign in / Register prompts on action buttons

---

### 2. **Professional Builders** (`role: builder` or `professional_builder`)
**Access:**
- ✅ View all suppliers and materials
- ✅ **Request Quote** button (PRIMARY ACTION)
- ✅ Create purchase orders
- ✅ Track orders
- ❌ Direct "Buy Now" (use Request Quote instead)

**Workflow:**
```
Browse Materials → Select Item → Request Quote → 
Supplier Sends Quote → Review Quote → Accept/Reject → 
Place Order → Track Delivery → Receive & Sign GRN
```

**Key Features:**
- Request quotes from multiple suppliers
- Compare prices and delivery terms
- Create detailed purchase orders
- Track order status
- Receive Goods Received Notes (GRN)

---

### 3. **Private Clients** (`role: private_client`)
**Access:**
- ✅ View all suppliers and materials
- ✅ **Buy Now** button (PRIMARY ACTION)
- ✅ Direct purchase capability
- ✅ Shopping cart functionality
- ❌ Quote requests (use Buy Now instead)

**Workflow:**
```
Browse Materials → Select Item → Buy Now → 
Add to Cart → Review Cart → Checkout → 
Payment → Arrange Delivery → Track Order → Receive
```

**Key Features:**
- Instant purchase without quotes
- Shopping cart for multiple items
- Direct checkout process
- Delivery tracking
- Order history

---

### 4. **Suppliers** (`role: supplier`)
**Access:**
- ✅ Supplier Workflow Dashboard
- ✅ Manage product catalog
- ✅ View and respond to purchase orders
- ✅ Generate QR codes for products
- ✅ Scan QR codes for verification
- ✅ Create delivery notes
- ✅ View GRN (Goods Received Notes)
- ✅ Generate invoices

**Workflow:**
```
Register as Supplier → Upload Products → 
Receive Orders/Quote Requests → Send Quotes → 
Process Orders → Generate QR Codes → 
Create Delivery Notes → Track Deliveries → 
Receive GRN → Generate Invoice → Payment
```

**Key Features:**
- Product catalog management
- Order management system
- QR code generation for products
- QR scanner for verification
- Delivery note creation
- GRN viewer
- Invoice generation

---

### 5. **Admin** (`role: admin`)
**Access:**
- ✅ ALL features from all roles
- ✅ Supplier applications management
- ✅ User management
- ✅ Platform analytics
- ✅ Approve/reject suppliers
- ✅ Monitor all transactions

**Workflow:**
```
Review Applications → Approve/Reject Suppliers → 
Monitor Marketplace → Handle Disputes → 
View Analytics → Manage Users
```

---

## 🗂️ Page Features & Tabs

### **Hero Section**
```
🇰🇪 Karibu - Welcome to Kenya's Premier
UjenziPro Suppliers Marketplace

Your Construction Materials Hub: Browse verified suppliers, 
explore product catalogs, compare prices, request quotes, 
place orders, arrange delivery across Kenya, track shipments, 
and verify quality with QR codes.
```

**Action Buttons:**
1. **Browse Suppliers** - View supplier directory
2. **Register as Supplier** - Supplier registration form
3. **Purchase Materials** - Start shopping

---

### **Tab Navigation (Role-Based)**

#### For **Guest Users / Builders / Private Clients:**
| Tab | Description | Who Sees It |
|-----|-------------|-------------|
| **Suppliers** | Materials marketplace with products | Everyone |
| **Purchase** | Create purchase orders | Logged-in users |
| **Register** | Supplier registration form | Builders wanting to become suppliers |

#### For **Suppliers:**
| Tab | Description | Icon |
|-----|-------------|------|
| **Workflow** | Supplier dashboard | 🏪 |
| **Purchase Orders** | Incoming orders | 🛒 |
| **QR Codes** | Generate product QR codes | 📦 |
| **QR Scanner** | Scan & verify products | 🔍 |
| **Delivery Notes** | Create delivery documentation | 📄 |
| **GRN Viewer** | View Goods Received Notes | 🚚 |
| **Invoices** | Generate & manage invoices | 🧾 |

#### For **Admins:**
| Tab | Description |
|-----|-------------|
| **Suppliers** | Full marketplace view |
| **Applications** | Review supplier applications |
| **Registered Users** | User management |

---

## 🔄 Workflow Diagrams

### **1. Professional Builder Quote Request Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│                    PROFESSIONAL BUILDER                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Browse Materials Marketplace (/suppliers?tab=suppliers) │
│     - View products from all suppliers                       │
│     - Filter by category, price, location                    │
│     - Check availability status                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Select Material & Click "Request Quote" (Blue Button)   │
│     IF NOT LOGGED IN → Redirect to /auth                    │
│     IF LOGGED IN → Continue                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Quote Request Form Opens                                │
│     - Material details pre-filled                            │
│     - Enter quantity needed                                  │
│     - Specify delivery location                              │
│     - Add project details                                    │
│     - Set timeline requirements                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Submit Quote Request                                     │
│     - Notification sent to supplier                          │
│     - Toast: "Quote request sent successfully"              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Wait for Supplier Response                               │
│     - Supplier reviews request                               │
│     - Supplier sends quote with:                             │
│       • Unit price                                           │
│       • Total cost                                           │
│       • Delivery terms                                       │
│       • Timeline                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Review Quote (Builder Dashboard)                         │
│     - Compare quotes from multiple suppliers                 │
│     - Check supplier ratings                                 │
│     - Review delivery terms                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   ACCEPT     │    │   REJECT     │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   └──> End
┌─────────────────────────────────────────────────────────────┐
│  7. Create Purchase Order (/suppliers?tab=purchase)         │
│     - Generate formal PO                                     │
│     - Include agreed terms                                   │
│     - Set payment schedule                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Track Order & Delivery                                   │
│     - Real-time delivery tracking                            │
│     - GPS location updates                                   │
│     - Driver contact info                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Receive Materials                                        │
│     - Scan QR codes to verify products                       │
│     - Inspect quantity & quality                             │
│     - Sign Goods Received Note (GRN)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Complete Transaction                                    │
│     - Receive invoice                                        │
│     - Process payment                                        │
│     - Rate supplier                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### **2. Private Client Direct Purchase Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│                      PRIVATE CLIENT                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Browse Materials Marketplace (/suppliers?tab=suppliers) │
│     - View products from all suppliers                       │
│     - See fixed prices                                       │
│     - Check stock availability                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Select Material & Click "Buy Now" (Green Button)        │
│     IF NOT LOGGED IN → Redirect to /auth                    │
│     IF LOGGED IN → Continue                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Add to Cart                                              │
│     - Material added to shopping cart                        │
│     - Toast: "Added to cart"                                 │
│     - Continue shopping or proceed to checkout               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Review Shopping Cart                                     │
│     - View all selected items                                │
│     - Adjust quantities                                      │
│     - Remove unwanted items                                  │
│     - See total cost                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Proceed to Checkout                                      │
│     - Enter delivery address                                 │
│     - Select delivery date                                   │
│     - Choose delivery method                                 │
│     - Enter contact information                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Payment                                                  │
│     - Select payment method:                                 │
│       • M-Pesa                                               │
│       • Bank Transfer                                        │
│       • Card Payment                                         │
│     - Complete payment                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Order Confirmation                                       │
│     - Order number generated                                 │
│     - Email confirmation sent                                │
│     - SMS notification                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Supplier Processes Order                                 │
│     - Order automatically sent to supplier                   │
│     - Supplier prepares materials                            │
│     - Generates QR codes                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Track Delivery (/tracking)                               │
│     - Real-time GPS tracking                                 │
│     - Estimated delivery time                                │
│     - Driver contact details                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Receive & Verify                                        │
│     - Scan QR codes on products                              │
│     - Verify quantities                                      │
│     - Check quality                                          │
│     - Sign digital receipt                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  11. Rate & Review                                           │
│     - Rate supplier (1-5 stars)                              │
│     - Rate delivery service                                  │
│     - Leave feedback                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Supplier Order Management Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│                          SUPPLIER                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Register as Supplier (/suppliers?tab=register)          │
│     - Fill registration form                                 │
│     - Submit business documents                              │
│     - Wait for admin approval                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Supplier Dashboard (/suppliers?tab=workflow)            │
│     - View pending orders                                    │
│     - Check quote requests                                   │
│     - Monitor inventory                                      │
│     - Track deliveries                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Manage Product Catalog                                   │
│     - Add new materials                                      │
│     - Upload product images                                  │
│     - Set prices                                             │
│     - Update stock levels                                    │
│     - Add product descriptions                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Receive Orders/Quote Requests                            │
│     QUOTE REQUEST (from builder):                            │
│     - Review request details                                 │
│     - Calculate pricing                                      │
│     - Send quote with terms                                  │
│                                                              │
│     DIRECT ORDER (from private client):                      │
│     - Receive order notification                             │
│     - Verify payment received                                │
│     - Begin processing                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Process Order (/suppliers?tab=purchase-orders)          │
│     - Confirm order acceptance                               │
│     - Update order status: "Processing"                      │
│     - Prepare materials                                      │
│     - Check inventory                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Generate QR Codes (/suppliers?tab=qr-codes)             │
│     - Create unique QR code for each product/batch           │
│     - QR contains:                                           │
│       • Product ID                                           │
│       • Batch number                                         │
│       • Manufacture date                                     │
│       • Supplier info                                        │
│     - Print and attach to products                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Create Delivery Note (/suppliers?tab=delivery-notes)   │
│     - Generate delivery documentation                        │
│     - List all items                                         │
│     - Include delivery address                               │
│     - Assign delivery provider                               │
│     - Set expected delivery date                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Arrange Delivery                                         │
│     - Select delivery provider                               │
│     - Coordinate pickup                                      │
│     - Share tracking info with buyer                         │
│     - Update order status: "In Transit"                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Monitor Delivery                                         │
│     - Track GPS location                                     │
│     - Receive real-time updates                              │
│     - Handle delivery issues                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Receive GRN (/suppliers?tab=grn-viewer)                │
│     - Customer signs Goods Received Note                     │
│     - Verify delivery completion                             │
│     - Check for any issues/returns                           │
│     - Update order status: "Delivered"                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  11. Generate Invoice (/suppliers?tab=invoices)             │
│     - Create invoice with:                                   │
│       • Order details                                        │
│       • Payment terms                                        │
│       • Tax information                                      │
│       • Bank details                                         │
│     - Send to customer                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  12. Payment & Completion                                    │
│     - Receive payment confirmation                           │
│     - Close order                                            │
│     - Update inventory                                       │
│     - Archive transaction                                    │
└─────────────────────────────────────────────────────────────┘
```

---

### **4. Admin Approval Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│                           ADMIN                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Admin Dashboard (/suppliers?tab=applications)           │
│     - View pending supplier applications                     │
│     - Monitor platform activity                              │
│     - Check user reports                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Review Supplier Application                              │
│     - Check business registration documents                  │
│     - Verify contact information                             │
│     - Review proposed product catalog                        │
│     - Check compliance with policies                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   APPROVE    │    │   REJECT     │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
    ┌────────────────────────┐  ┌──────────────────────┐
    │ 3. Supplier Activated  │  │ Send Rejection Email │
    │    - Account enabled   │  │ with feedback        │
    │    - Access granted    │  └──────────────────────┘
    │    - Welcome email     │
    └────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Ongoing Monitoring                                       │
│     - Review supplier ratings                                │
│     - Handle disputes                                        │
│     - Monitor compliance                                     │
│     - Suspend if violations                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### **Sign In Process**

```
User Not Logged In
        │
        ▼
Clicks "Request Quote" or "Buy Now"
        │
        ▼
Redirect to: /auth?redirect=/suppliers?tab=purchase
        │
        ▼
┌───────────────────────┐
│   Auth Page Opens     │
│   - Email/Password    │
│   - Sign In / Sign Up │
└───────────────────────┘
        │
        ▼
User Signs In/Up
        │
        ▼
Supabase Authentication
        │
        ▼
Check user_roles table for role
        │
        ▼
Redirect back to: /suppliers?tab=purchase
        │
        ▼
User can now use Request Quote / Buy Now
```

### **Role Assignment**

When a user registers, they are assigned a role in the `user_roles` table:

| Registration Type | Assigned Role |
|-------------------|---------------|
| Builder Registration | `builder` or `professional_builder` |
| Private Client Registration | `private_client` |
| Supplier Registration | `supplier` (after admin approval) |
| Admin | `admin` (manually assigned) |

---

## 🛒 Purchase Workflows

### **Materials Marketplace Display**

**Component:** `MaterialsGridSafe`

Each material card shows:
- 📦 Product name
- 🏷️ Category
- 💰 Price (KES)
- 🏪 Supplier name
- ✅/❌ Stock status
- 🔵 **Request Quote** button (blue)
- 🟢 **Buy Now** button (green)

**Button Behavior:**

| User Type | Request Quote | Buy Now |
|-----------|---------------|---------|
| **Guest** | Redirects to /auth | Redirects to /auth |
| **Professional Builder** | ✅ Opens quote form | ❌ Shows message to use Request Quote |
| **Private Client** | ❌ Shows message to use Buy Now | ✅ Adds to cart |
| **Supplier** | ⚠️ Not applicable | ⚠️ Not applicable |
| **Admin** | ✅ Full access | ✅ Full access |

---

## 🔧 Technical Implementation

### **Key Components**

1. **Suppliers.tsx** - Main page container
   - Handles authentication
   - Manages tab navigation
   - Controls role-based rendering

2. **MaterialsGridSafe.tsx** - Product display component
   - Shows material cards
   - Contains Request Quote / Buy Now buttons
   - Handles authentication redirects
   - Shows appropriate buttons based on user role

3. **PurchaseOrderWizard.tsx** - Purchase order creation
   - Multi-step form
   - Cart management
   - Order submission

4. **SupplierWorkflowDashboard.tsx** - Supplier management interface
   - Order tracking
   - Product management
   - Analytics

### **Authentication Check**

```typescript
const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Get role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const userRole = roleData?.role || 'builder';
    setUserRole(userRole);
  }
};
```

### **Button Click Handlers**

**Request Quote:**
```typescript
const handleRequestQuote = (material) => {
  if (!user) {
    // Redirect to auth
    window.location.href = '/auth?redirect=/suppliers?tab=purchase';
    return;
  }

  if (userRole === 'builder' || userRole === 'professional_builder') {
    // Show quote request form
    toast({
      title: 'Quote Request Initiated',
      description: `Requesting quote for ${material.name}`
    });
  } else {
    // Show error for wrong role
    toast({
      title: 'Professional Builders Only',
      description: 'Please use Buy Now instead',
      variant: 'destructive'
    });
  }
};
```

**Buy Now:**
```typescript
const handleBuyNow = (material) => {
  if (!user) {
    // Redirect to auth
    window.location.href = '/auth?redirect=/suppliers?tab=purchase';
    return;
  }

  if (userRole === 'private_client' || userRole === 'builder') {
    // Add to cart
    toast({
      title: 'Purchase Initiated',
      description: `Adding ${material.name} to cart`
    });
  } else {
    // Show error for wrong role
    toast({
      title: 'Private Clients Only',
      description: 'Please use Request Quote instead',
      variant: 'destructive'
    });
  }
};
```

---

## 📊 Database Tables Involved

### **user_roles**
```sql
- user_id (uuid, FK to auth.users)
- role (text: 'admin', 'supplier', 'builder', 'professional_builder', 'private_client')
```

### **suppliers**
```sql
- id (uuid)
- company_name (text)
- contact_email (text)
- phone (text)
- location (text)
- rating (decimal)
- materials_offered (text[])
- specialties (text[])
```

### **materials**
```sql
- id (uuid)
- name (text)
- category (text)
- unit_price (decimal)
- in_stock (boolean)
- supplier_id (uuid, FK)
- image_url (text)
```

### **purchase_orders**
```sql
- id (uuid)
- buyer_id (uuid, FK)
- supplier_id (uuid, FK)
- status (text)
- total_amount (decimal)
- created_at (timestamp)
```

### **quote_requests**
```sql
- id (uuid)
- builder_id (uuid, FK)
- supplier_id (uuid, FK)
- material_id (uuid, FK)
- quantity (integer)
- status (text: 'pending', 'quoted', 'accepted', 'rejected')
```

---

## 🎨 UI/UX Features

### **Visual Hierarchy**
- **Blue buttons** = Professional builders (quotes)
- **Green buttons** = Private clients (direct purchase)
- **Orange buttons** = General actions (purchase tab)

### **Toast Notifications**
- Success: Quote sent, item added to cart
- Error: Wrong role, not authenticated
- Info: Status updates

### **Mobile Optimization**
- Responsive grid layout
- Touch-friendly buttons
- Simplified navigation on small screens
- Redirects to `/suppliers-mobile` for optimal experience

---

## 🚀 Deployment Status

✅ **Changes Committed to Git**
✅ **Pushed to GitHub:** `https://github.com/hillarytaley-ops/UjenziPro.git`
✅ **Production Build Complete**
⏳ **Vercel Deployment:** Ready to deploy

---

## 📞 Support & Contact

For technical issues or questions:
- **Platform:** UjenziPro
- **Support Email:** support@ujenzipro.com
- **Phone:** +254 XXX XXX XXX

---

## 📝 Change Log

**Latest Update (2024):**
- ✅ Added Request Quote button for professional builders
- ✅ Added Buy Now button for private clients
- ✅ Implemented role-based access control
- ✅ Added authentication redirects
- ✅ Enhanced MaterialsGridSafe component
- ✅ Improved user notifications with toast messages

---

**End of Suppliers Page Workflow Documentation** 🇰🇪


