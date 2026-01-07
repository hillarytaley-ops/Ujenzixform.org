# 🏗️ MradiPro - Complete Application Workflow

**Kenya's Premier Construction Material Marketplace Platform**

---

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [User Journey Workflows](#user-journey-workflows)
3. [Technical Architecture](#technical-architecture)
4. [Page-by-Page Workflows](#page-by-page-workflows)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Authentication Flow](#authentication-flow)
7. [Order Processing Flow](#order-processing-flow)
8. [Delivery Tracking Flow](#delivery-tracking-flow)
9. [Development Workflow](#development-workflow)
10. [Deployment Workflow](#deployment-workflow)

---

## 🎯 Application Overview

### **What is MradiPro?**

MradiPro is a comprehensive digital platform that connects:
- 🏗️ **Builders** (Professional & Private) - Need construction materials
- 📦 **Suppliers** - Provide construction materials
- 🚚 **Delivery Providers** - Transport materials
- 👨‍💼 **Admins** - Manage the platform

### **Core Features:**

1. **Supplier Marketplace** - Browse and purchase materials
2. **Builder Directory** - Find and register builders
3. **Delivery Tracking** - Real-time GPS tracking
4. **Order Management** - Purchase orders and invoices
5. **Live Monitoring** - Construction site cameras
6. **QR/Barcode Scanner** - Track materials
7. **AI Chatbot** - 24/7 customer support
8. **Analytics Dashboard** - Business insights
9. **Feedback System** - Reviews and ratings

---

## 🚀 Complete Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MRADIPRO PLATFORM                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │         FRONTEND (React + Vite)          │
        │  ─────────────────────────────────────  │
        │  • React 18.3.1                         │
        │  • TypeScript 5.5.3                     │
        │  • Vite 7.1.9 (Build Tool)             │
        │  • Tailwind CSS 3.4.11 (Styling)       │
        │  • React Router 6.26.2 (Navigation)    │
        └────────────────┬────────────────────────┘
                         │
                         ↓
        ┌─────────────────────────────────────────┐
        │    BACKEND (Supabase - PostgreSQL)      │
        │  ─────────────────────────────────────  │
        │  • Authentication (Auth.js)             │
        │  • Database (PostgreSQL)                │
        │  • Storage (S3-compatible)              │
        │  • Real-time (WebSockets)               │
        │  • Edge Functions (Serverless)          │
        └────────────────┬────────────────────────┘
                         │
                         ↓
        ┌─────────────────────────────────────────┐
        │       HOSTING (Vercel Global CDN)       │
        │  ─────────────────────────────────────  │
        │  • Edge Network (150+ locations)        │
        │  • SSL/HTTPS (Automatic)                │
        │  • Auto-scaling                         │
        │  • CI/CD (GitHub integration)           │
        └─────────────────────────────────────────┘
```

---

## 👥 User Journey Workflows

### **1. BUILDER JOURNEY**

```
┌──────────────────────────────────────────────────────────────┐
│                    BUILDER WORKFLOW                          │
└──────────────────────────────────────────────────────────────┘

STEP 1: Discovery & Registration
─────────────────────────────────
Builder discovers MradiPro
         │
         ├─► Via: Google Search, Social Media, Referral
         │
         ↓
Visits https://ujenzipro.vercel.app
         │
         ↓
Views Homepage
         │
         ├─► Sees: Hero section, Features, Testimonials
         ├─► Learns: Platform benefits
         │
         ↓
Clicks "Sign Up" or "Get Started"
         │
         ↓
┌─────────────────────────────────────┐
│  REGISTRATION PAGE                  │
│  ─────────────────────────          │
│  Choose Builder Type:               │
│  ○ Professional Builder             │
│  ○ Private Client                   │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘
         │
         ↓

PROFESSIONAL BUILDER PATH:
─────────────────────────
Fill Registration Form:
  • Full Name
  • Email Address
  • Phone Number
  • Company Name
  • NCA Registration Number
  • Years of Experience
  • Specialization
  • County/Location
  • Upload: NCA Certificate
  • Upload: Business License
         │
         ↓
Submit for Admin Approval
         │
         ↓
Admin Reviews Application
         │
         ├─► Approved → Email sent → Account active
         └─► Rejected → Email sent → Re-application


PRIVATE CLIENT PATH:
───────────────────
Fill Registration Form:
  • Full Name
  • Email Address
  • Phone Number
  • Project Location
  • Project Type
  • Estimated Budget
         │
         ↓
Instant Account Creation ✓
         │
         ↓


STEP 2: Browse Suppliers & Materials
────────────────────────────────────
Logs into Account
         │
         ↓
Dashboard Display:
  • Active Orders
  • Saved Suppliers
  • Recent Deliveries
  • Messages
         │
         ↓
Navigates to "Suppliers" Page
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  SUPPLIER MARKETPLACE                                   │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Filters:                                               │
│  ☑ Material Type: [Cement, Steel, Sand...]            │
│  ☑ County: [Nairobi, Mombasa, Kisumu...]              │
│  ☑ Price Range: [KES 0 - 50,000]                      │
│  ☑ Rating: ⭐⭐⭐⭐⭐                                    │
│                                                         │
│  Search: [Search materials or suppliers...]            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ SUPPLIER 1   │  │ SUPPLIER 2   │  │ SUPPLIER 3   ││
│  │ [Logo]       │  │ [Logo]       │  │ [Logo]       ││
│  │ Bamburi      │  │ Devki Steel  │  │ ARM Cement   ││
│  │ ⭐⭐⭐⭐⭐    │  │ ⭐⭐⭐⭐☆    │  │ ⭐⭐⭐⭐⭐    ││
│  │ [View More]  │  │ [View More]  │  │ [View More]  ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
         │
         ↓


STEP 3: Select Supplier & View Products
───────────────────────────────────────
Clicks on Supplier Card
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  SUPPLIER DETAIL PAGE                                   │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  📦 Bamburi Cement Limited                             │
│  ⭐⭐⭐⭐⭐ (4.8/5.0 - 156 reviews)                     │
│  📍 Mombasa Road, Nairobi                              │
│  📞 +254 712 345 678                                    │
│  ✓ Verified Supplier                                   │
│                                                         │
│  PRODUCTS CATALOG:                                      │
│                                                         │
│  ┌──────────────────────────────────────────┐          │
│  │ Cement 50kg                              │          │
│  │ [Product Image]                          │          │
│  │ Price: KES 850/bag                       │          │
│  │ In Stock: 500+ bags                      │          │
│  │ Min Order: 10 bags                       │          │
│  │ [Add to Cart] [Quick Order]             │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  ┌──────────────────────────────────────────┐          │
│  │ Steel Bars 12mm                          │          │
│  │ [Product Image]                          │          │
│  │ Price: KES 750/piece                     │          │
│  │ In Stock: 200+ pieces                    │          │
│  │ [Add to Cart] [Quick Order]             │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  [Contact Supplier] [Save Supplier]                    │
└─────────────────────────────────────────────────────────┘
         │
         ↓


STEP 4: Create Purchase Order
─────────────────────────────
Adds products to cart
         │
         ↓
Cart Summary:
  • Cement 50kg - 100 bags - KES 85,000
  • Steel Bars - 200 pcs - KES 150,000
  • Building Sand - 10 tonnes - KES 20,000
  ────────────────────────────────────────
  Subtotal: KES 255,000
  Delivery: KES 5,000
  VAT (16%): KES 41,600
  ────────────────────────────────────────
  TOTAL: KES 301,600
         │
         ↓
Proceeds to Checkout
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  CHECKOUT PAGE                                          │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Delivery Information:                                  │
│  • Site Address: [Westlands, Plot 123]                 │
│  • Contact Person: [John Kamau]                        │
│  • Phone: [+254 712 345 678]                           │
│  • Delivery Date: [20 Nov 2024]                        │
│  • Time Slot: [9:00 AM - 12:00 PM]                     │
│  • Special Instructions: [Gate code: 1234]             │
│                                                         │
│  Payment Method:                                        │
│  ○ M-Pesa                                               │
│  ○ Bank Transfer                                        │
│  ○ Credit Card                                          │
│  ○ Cash on Delivery                                     │
│                                                         │
│  [Place Order]                                          │
└─────────────────────────────────────────────────────────┘
         │
         ↓
Order Submitted
         │
         ├─► Database: Order created
         ├─► QR Codes: Auto-generated for tracking
         ├─► Email: Order confirmation sent
         ├─► SMS: Confirmation sent
         └─► Supplier: Notified
         │
         ↓


STEP 5: Order Processing & Tracking
───────────────────────────────────
Order Status Updates:
         │
         ├─► CONFIRMED (Supplier accepted)
         ├─► PREPARING (Items being packed)
         ├─► READY (Items loaded on vehicle)
         ├─► IN_TRANSIT (On the way)
         └─► DELIVERED (Completed)
         │
         ↓
Real-time Tracking Available:
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  DELIVERY TRACKING PAGE                                 │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Order #PO-2024-156                                     │
│  Status: ● IN TRANSIT                                   │
│                                                         │
│  [Live Map with GPS marker]                             │
│  📍 Current Location: Mombasa Road                      │
│  🚚 Driver: James Mwangi                                │
│  📞 +254 722 123 456                                    │
│                                                         │
│  Estimated Arrival: 2:30 PM (45 mins)                   │
│  Progress: ████████████░░░░░ 75%                       │
│                                                         │
│  [Call Driver] [View Details] [Share Location]         │
└─────────────────────────────────────────────────────────┘
         │
         ↓


STEP 6: Delivery & Confirmation
───────────────────────────────
Driver arrives at site
         │
         ↓
Scans QR codes on packages
         │
         ↓
Builder/Client verifies items:
  • Check quantities
  • Inspect condition
  • Note any issues
         │
         ↓
Digital signature capture
         │
         ↓
Photos of delivered items
         │
         ↓
Confirm Delivery
         │
         ├─► Database: Status updated to DELIVERED
         ├─► Receipt: Auto-generated
         ├─► Email: Receipt sent to all parties
         └─► Payment: Processed
         │
         ↓


STEP 7: Post-Delivery
─────────────────────
Builder receives:
  • Digital receipt
  • Invoice
  • Delivery photos
  • QR codes for records
         │
         ↓
Option to:
  • Rate supplier ⭐⭐⭐⭐⭐
  • Leave feedback
  • Request invoice copy
  • Report issues
  • Reorder materials
         │
         ↓
Order History Updated
         │
         ↓
[END OF BUILDER JOURNEY]
```

---

### **2. SUPPLIER JOURNEY**

```
┌──────────────────────────────────────────────────────────────┐
│                    SUPPLIER WORKFLOW                         │
└──────────────────────────────────────────────────────────────┘

STEP 1: Supplier Registration
─────────────────────────────
Supplier applies to join platform
         │
         ↓
Registration Form:
  • Company Name
  • Registration Number
  • Email
  • Phone Number
  • Physical Address
  • County Coverage
  • Material Categories
  • Upload: Business License
  • Upload: Tax Compliance Certificate
  • Upload: Company Logo
         │
         ↓
Admin Reviews Application
         │
         ├─► Approved → Account created
         └─► Rejected → Reapplication option
         │
         ↓


STEP 2: Product Catalog Setup
─────────────────────────────
Supplier logs in
         │
         ↓
Dashboard Access:
  • Pending Orders
  • Active Deliveries
  • Revenue Stats
  • Product Management
         │
         ↓
Navigates to "Products" Section
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  PRODUCT MANAGEMENT                                     │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  [+ Add New Product]                                    │
│                                                         │
│  Current Products:                                      │
│                                                         │
│  ┌──────────────────────────────────────────┐          │
│  │ ✏️ Cement 50kg                           │          │
│  │ Price: KES 850                           │          │
│  │ Stock: 500 bags                          │          │
│  │ Status: ✓ Active                         │          │
│  │ [Edit] [Delete] [View]                   │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  ┌──────────────────────────────────────────┐          │
│  │ ✏️ Steel Bars 12mm                       │          │
│  │ Price: KES 750                           │          │
│  │ Stock: 200 pieces                        │          │
│  │ Status: ✓ Active                         │          │
│  │ [Edit] [Delete] [View]                   │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
         │
         ↓
Adds New Product:
  • Product Name
  • Category
  • Description
  • Price
  • Unit (bags, tonnes, pieces)
  • Stock Quantity
  • Min Order Quantity
  • Upload Images (up to 5)
  • Specifications
  • Delivery options
         │
         ↓
Product Published ✓
         │
         ↓


STEP 3: Receive Order Notification
──────────────────────────────────
New order placed by builder
         │
         ├─► Email notification sent
         ├─► SMS notification sent
         └─► In-app notification
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  📧 NEW ORDER NOTIFICATION                              │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Order #PO-2024-156                                     │
│  From: John Kamau Construction                          │
│  Amount: KES 301,600                                    │
│  Delivery: 20 Nov 2024                                  │
│                                                         │
│  Items:                                                 │
│  • Cement 50kg - 100 bags                              │
│  • Steel Bars 12mm - 200 pieces                        │
│  • Building Sand - 10 tonnes                            │
│                                                         │
│  [View Order] [Accept] [Reject]                        │
└─────────────────────────────────────────────────────────┘
         │
         ↓


STEP 4: Order Processing
────────────────────────
Supplier reviews order
         │
         ↓
Checks:
  • Product availability
  • Stock levels
  • Delivery capacity
  • Timeline feasibility
         │
         ├─► If OK: Accept Order
         └─► If Issues: Contact Builder / Reject
         │
         ↓
Order Accepted
         │
         ↓
Update Order Status: PREPARING
         │
         ↓


STEP 5: Warehouse Operations
────────────────────────────
Print QR code labels (auto-generated)
         │
         ↓
Warehouse staff:
  1. Pick items from inventory
  2. Verify quantities
  3. Check quality
  4. Attach QR labels to packages
  5. Prepare packing list
         │
         ↓
Items staged for loading
         │
         ↓
Update Order Status: READY
         │
         ↓


STEP 6: Loading & Dispatch
──────────────────────────
Driver assigned to order
         │
         ↓
Supplier/Warehouse staff scans QR codes during loading:
  • Scan Item #1 QR → Verified ✓ (Supplier scans)
  • Scan Item #2 QR → Verified ✓ (Supplier scans)
  • Scan Item #3 QR → Verified ✓ (Supplier scans)
         │
         ↓
Loading Complete:
  • All items scanned by supplier
  • Photos taken
  • Driver signature (confirms receipt)
  • Vehicle checked
         │
         ↓
Dispatch Note Generated (with QR code)
         │
         ↓
Update Order Status: IN_TRANSIT
         │
         ├─► Builder notified (SMS + Email)
         ├─► GPS tracking activated
         └─► ETA calculated
         │
         ↓


STEP 7: Delivery Monitoring
───────────────────────────
Supplier tracks delivery in real-time:
         │
         ↓
Live Dashboard Shows:
  • Driver location on map
  • Current status
  • ETA
  • Builder contact info
         │
         ↓
Driver arrives at site
         │
         ↓
Builder/Site staff scans items during offloading
Builder verifies quantities and condition
Builder signs to confirm receipt
         │
         ↓
Delivery Confirmed
         │
         ├─► Status: DELIVERED
         ├─► Receipt generated
         ├─► Payment processed
         └─► Inventory updated
         │
         ↓


STEP 8: Post-Delivery
─────────────────────
Supplier receives:
  • Delivery confirmation
  • Digital receipt with signatures
  • Photos from site
  • Payment confirmation
         │
         ↓
Dashboard Updated:
  • Revenue added
  • Stock levels decreased
  • Order history recorded
  • Analytics updated
         │
         ↓
Option to:
  • View builder feedback
  • Generate invoice
  • Request review
  • Track payment
         │
         ↓
[END OF SUPPLIER JOURNEY]
```

---

### **3. DELIVERY PROVIDER JOURNEY**

```
┌──────────────────────────────────────────────────────────────┐
│                DELIVERY PROVIDER WORKFLOW                    │
└──────────────────────────────────────────────────────────────┘

STEP 1: Driver Application
──────────────────────────
Apply to become delivery driver
         │
         ↓
Application Form:
  • Full Name
  • Phone Number
  • Email
  • Driver's License Number
  • Vehicle Type
  • Vehicle Registration
  • County Coverage
  • Years of Experience
  • Upload: License Photo
  • Upload: Vehicle Photos
  • Upload: Insurance Certificate
         │
         ↓
Background Check & Verification
         │
         ├─► Approved → Driver account created
         └─► Rejected → Reapplication
         │
         ↓


STEP 2: Delivery Assignment
───────────────────────────
Supplier assigns delivery to driver
         │
         ↓
Driver receives notification:
         │
         ├─► Push notification
         ├─► SMS
         └─► In-app alert
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  🚚 NEW DELIVERY ASSIGNMENT                             │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Order: PO-2024-156                                     │
│  Pickup: Bamburi Cement, Mombasa Road                   │
│  Delivery: Westlands, Plot 123, Nairobi                │
│  Distance: 12.5 km                                      │
│  Est. Time: 45 minutes                                  │
│                                                         │
│  Items: 3 packages                                      │
│  Weight: 5.2 tonnes                                     │
│                                                         │
│  Pickup Time: 10:00 AM                                  │
│  Delivery Window: 2:00 - 4:00 PM                        │
│                                                         │
│  [Accept] [Decline] [View Details]                     │
└─────────────────────────────────────────────────────────┘
         │
         ↓
Driver accepts delivery
         │
         ↓


STEP 3: Loading at Warehouse
────────────────────────────
Driver arrives at supplier warehouse
         │
         ↓
Supplier/Warehouse staff opens MradiPro Scanner App
         │
         ↓
Scans Dispatch Note QR Code
         │
         ↓
Displays loading checklist:
  ☐ Cement 50kg - 100 bags
  ☐ Steel Bars 12mm - 200 pcs
  ☐ Building Sand - 10 tonnes
         │
         ↓
Supplier/Warehouse staff scans each item QR code:
         │
         ├─► Scan Item #1 → ✓ Verified & Loaded (Supplier scans)
         ├─► Scan Item #2 → ✓ Verified & Loaded (Supplier scans)
         └─► Scan Item #3 → ✓ Verified & Loaded (Supplier scans)
         │
         ↓
Take photos of loaded items
         │
         ↓
Digital signature (Supplier/Warehouse Staff + Driver confirms receipt)
         │
         ↓
Confirm: All items loaded ✓
         │
         ↓
GPS Tracking Activated
         │
         ↓


STEP 4: In Transit
─────────────────
Driver starts journey
         │
         ↓
Real-time tracking active:
  • GPS location updated every 30s
  • Route displayed on map
  • ETA calculated
  • All parties can track
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  DRIVER APP - IN TRANSIT                                │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  [Live Map showing route]                               │
│                                                         │
│  Next Stop:                                             │
│  📍 Westlands, Plot 123                                 │
│  🕐 ETA: 2:30 PM (45 mins)                             │
│  📞 Contact: John Kamau (+254 712...)                   │
│                                                         │
│  Status: ● ON TIME                                      │
│                                                         │
│  [Navigation] [Call Client] [Report Issue]             │
└─────────────────────────────────────────────────────────┘
         │
         ↓
Driver can:
  • Follow GPS navigation
  • Call builder if needed
  • Report traffic/delays
  • Update ETA
         │
         ↓


STEP 5: Arrival at Delivery Site
────────────────────────────────
Driver arrives at destination
         │
         ↓
App automatically detects arrival (GPS)
         │
         ↓
Notification sent to builder:
"Your delivery has arrived!"
         │
         ↓
Driver meets builder/site contact
         │
         ↓


STEP 6: Offloading & Verification
─────────────────────────────────
Driver opens scanner app
         │
         ↓
Scans Dispatch Note QR
         │
         ↓
Displays offloading checklist
         │
         ↓
For each item:
  1. Scan item QR code
  2. Builder verifies quantity
  3. Builder checks condition
  4. Take delivery photo
  5. Mark as delivered ✓
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│  DELIVERY VERIFICATION                                  │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Items Verified: 3/3 ✓                                  │
│                                                         │
│  ✓ Cement 50kg - 100 bags (Good condition)            │
│  ✓ Steel Bars 12mm - 200 pcs (Good condition)         │
│  ✓ Building Sand - 10 tonnes (Good condition)         │
│                                                         │
│  Builder Signature:                                     │
│  [Signature Pad]                                        │
│                                                         │
│  Additional Photos: [📷 Take Photo]                     │
│                                                         │
│  Notes: [Any issues or comments...]                    │
│                                                         │
│  [Complete Delivery]                                    │
└─────────────────────────────────────────────────────────┘
         │
         ↓
Builder signs digitally
         │
         ↓
Photos captured
         │
         ↓


STEP 7: Completion
─────────────────
Driver confirms delivery complete
         │
         ↓
System processes:
  • Upload signature
  • Upload photos
  • Update status: DELIVERED
  • Generate receipt
  • Send notifications
  • Process payment
         │
         ↓
Digital receipt generated:
  • Order details
  • Delivery timestamp
  • Signatures (driver + builder)
  • Photos
  • GPS coordinates
         │
         ↓
Sent to:
  ├─► Builder (Email + SMS)
  ├─► Supplier (Email + SMS)
  └─► Driver (Email + SMS)
         │
         ↓
Driver earnings updated
         │
         ↓
[END OF DELIVERY PROVIDER JOURNEY]
```

---

## 🗺️ Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                               │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   PAGES      │  │  COMPONENTS  │  │   ROUTING    │             │
│  │              │  │              │  │              │             │
│  │ • Index      │  │ • Navigation │  │ React Router │             │
│  │ • Auth       │  │ • Footer     │  │ 6.26.2       │             │
│  │ • Suppliers  │  │ • Cards      │  │              │             │
│  │ • Builders   │  │ • Forms      │  │ • /          │             │
│  │ • Delivery   │  │ • Tables     │  │ • /auth      │             │
│  │ • Tracking   │  │ • Modals     │  │ • /suppliers │             │
│  │ • Feedback   │  │ • Chat       │  │ • /delivery  │             │
│  │ • Scanners   │  │ • Scanner    │  │ • /tracking  │             │
│  │ • Analytics  │  │ • Charts     │  │ • ...        │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                    │
│         └──────────────────┴──────────────────┘                    │
│                            │                                        │
│  ┌─────────────────────────┴─────────────────────────┐             │
│  │              STATE MANAGEMENT                     │             │
│  │  • React Hooks (useState, useEffect)             │             │
│  │  • Context API (Theme, Language, Auth)           │             │
│  │  • TanStack Query (Data fetching & caching)      │             │
│  └───────────────────────────────────────────────────┘             │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER                                    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         SUPABASE CLIENT (@supabase/supabase-js)      │          │
│  │  ──────────────────────────────────────────────────  │          │
│  │                                                      │          │
│  │  • Authentication (Auth.js)                         │          │
│  │    └─ signUp(), signIn(), signOut()                │          │
│  │                                                      │          │
│  │  • Database Queries (PostgreSQL)                    │          │
│  │    └─ from('table').select().insert().update()     │          │
│  │                                                      │          │
│  │  • Storage (File uploads)                           │          │
│  │    └─ upload(), download(), getPublicUrl()         │          │
│  │                                                      │          │
│  │  • Real-time (WebSocket subscriptions)              │          │
│  │    └─ on('INSERT').on('UPDATE').subscribe()        │          │
│  │                                                      │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (Supabase)                       │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ AUTHENTICATION│  │   DATABASE   │  │   STORAGE    │             │
│  │              │  │              │  │              │             │
│  │ • Users      │  │ PostgreSQL   │  │ S3-Compatible│             │
│  │ • Sessions   │  │              │  │              │             │
│  │ • Roles      │  │ Tables:      │  │ Buckets:     │             │
│  │ • Policies   │  │ • users      │  │ • avatars    │             │
│  │              │  │ • suppliers  │  │ • products   │             │
│  │ JWT Tokens   │  │ • builders   │  │ • documents  │             │
│  │ Row Level    │  │ • orders     │  │ • photos     │             │
│  │ Security     │  │ • deliveries │  │              │             │
│  │              │  │ • materials  │  │ Auto-CDN     │             │
│  └──────────────┘  │ • user_roles │  │ delivery     │             │
│                    │ • feedback   │  └──────────────┘             │
│                    │              │                                │
│                    │ Real-time:   │                                │
│                    │ • WebSockets │                                │
│                    │ • Pub/Sub    │                                │
│                    └──────────────┘                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │            EDGE FUNCTIONS (Serverless)               │          │
│  │  ──────────────────────────────────────────────────  │          │
│  │  • Email notifications                               │          │
│  │  • SMS notifications                                 │          │
│  │  • Payment processing                                │          │
│  │  • QR code generation                                │          │
│  │  • PDF generation                                    │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT LAYER (Vercel)                         │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         GLOBAL CDN (150+ Edge Locations)             │          │
│  │  ──────────────────────────────────────────────────  │          │
│  │                                                      │          │
│  │  🌍 REGIONS:                                         │          │
│  │  • North America (New York, SF, Toronto...)         │          │
│  │  • Europe (London, Paris, Frankfurt...)             │          │
│  │  • Africa (Nairobi, Lagos, Cairo...)                │          │
│  │  • Asia Pacific (Singapore, Tokyo, Mumbai...)       │          │
│  │  • South America (São Paulo, Buenos Aires...)       │          │
│  │                                                      │          │
│  │  ⚡ FEATURES:                                        │          │
│  │  • SSL/HTTPS (Automatic)                            │          │
│  │  • DDoS Protection                                   │          │
│  │  • Auto-scaling                                      │          │
│  │  • Edge Caching                                      │          │
│  │  • Instant Rollbacks                                 │          │
│  │  • Preview Deployments                               │          │
│  │                                                      │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ↓
                    🌐 END USERS
                    (Builders, Suppliers, Drivers)
```

---

## 📄 Page-by-Page Workflows

### **Page 1: Homepage (Index)**

**URL:** `/` or `/home`

**Purpose:** Landing page, introduce platform

**User Flow:**
```
User visits https://ujenzipro.vercel.app
         │
         ↓
Homepage Loads
         │
         ├─► Hero Section (Main CTA)
         ├─► Features Section
         ├─► How It Works
         ├─► Testimonials
         ├─► Statistics
         └─► Footer with links
         │
         ↓
User Actions:
  • Click "Get Started" → /auth (Sign up)
  • Click "Find Suppliers" → /suppliers
  • Click "Register as Builder" → /builders/register
  • Click "Become a Supplier" → Contact form
  • Scroll to learn more
```

---

### **Page 2: Authentication (Auth)**

**URL:** `/auth`

**Purpose:** User registration and login

**User Flow:**
```
Two Tabs: SIGN UP | SIGN IN
         │
         ↓
SIGN UP TAB:
─────────────
Enter Details:
  • Email
  • Password
  • Confirm Password
  • Accept Terms
         │
         ↓
Submit Registration
         │
         ├─► Validation checks
         ├─► Create Supabase auth user
         ├─► Send verification email
         ├─► Redirect to /builders/register or /suppliers
         │
         ↓
Email Verification
         │
         ↓
Account Active


SIGN IN TAB:
────────────
Enter Credentials:
  • Email
  • Password
         │
         ↓
Submit Login
         │
         ├─► Validate with Supabase
         ├─► Check user role
         └─► Redirect based on role:
             ├─► Builder → /home
             ├─► Supplier → /supplier-dashboard
             ├─► Admin → /admin
             └─► Driver → /delivery-dashboard
         │
         ↓
Dashboard Access


FORGOT PASSWORD:
────────────────
Enter Email
         │
         ↓
Reset Link Sent
         │
         ↓
Create New Password
         │
         ↓
Password Updated
```

---

### **Page 3: Suppliers Marketplace**

**URL:** `/suppliers`

**Purpose:** Browse and purchase from suppliers

**User Flow:**
```
Page Loads with:
  • Supplier cards grid
  • Search bar
  • Filter sidebar
  • Sort options
         │
         ↓
USER ACTIONS:

1. SEARCH:
   Type material name → Results filter in real-time

2. FILTER:
   ☑ County: Nairobi, Mombasa, etc.
   ☑ Material Type: Cement, Steel, Sand, etc.
   ☑ Price Range: Slider
   ☑ Rating: ⭐⭐⭐⭐⭐
   → Results update

3. SORT:
   • Price: Low to High
   • Price: High to Low
   • Rating: High to Low
   • Newest First
   → Results reorder

4. VIEW SUPPLIER:
   Click supplier card
   →  Navigate to supplier detail page
   → View full catalog
   → Add items to cart
   → Place order
         │
         ↓
CHECKOUT PROCESS:
  1. Review cart
  2. Enter delivery info
  3. Select payment method
  4. Confirm order
  5. Order placed ✓
```

---

### **Page 4: Builders Directory**

**URL:** `/builders`

**Purpose:** Browse professional builders, register as builder

**User Flow:**
```
Page Shows:
  • Builder profiles
  • Search functionality
  • Filter by specialization, location
  • Registration CTA
         │
         ↓
USER ACTIONS:

1. BROWSE BUILDERS:
   • View profiles
   • Check ratings
   • See completed projects
   • Contact builders

2. REGISTER AS BUILDER:
   Click "Register as Builder"
   →  /builders/register
   → Choose type (Professional/Private)
   → Fill form
   → Submit application
   → Await approval (Professional)
   → OR instant access (Private)
```

---

### **Page 5: Delivery Management**

**URL:** `/delivery`

**Purpose:** Request deliveries, track shipments

**User Flow:**
```
Tabs Available:
  • Request Delivery
  • Active Deliveries
  • History
  • Apply as Driver
         │
         ↓
REQUEST DELIVERY TAB:
─────────────────────
Form Fields:
  • Material Type
  • Quantity
  • Pickup Address
  • Delivery Address
  • Contact Info
  • Preferred Date/Time
  • Special Instructions
         │
         ↓
Submit Request
         │
         ├─► Delivery providers notified
         ├─► Quotes received
         └─► Delivery assigned
         │
         ↓


ACTIVE DELIVERIES TAB:
──────────────────────
Shows:
  • Current deliveries
  • Status for each
  • Driver info
  • ETA
  • Track button
         │
         ↓
Click "Track Delivery"
         │
         ↓
Real-time GPS tracking page
```

---

### **Page 6: Tracking**

**URL:** `/tracking`

**Purpose:** Real-time delivery tracking

**User Flow:**
```
Page Loads with:
  • Live map
  • Active deliveries list
  • Tracking details
  • Communication options
         │
         ↓
FEATURES:

1. LIVE MAP:
   • Shows driver location (GPS)
   • Shows route
   • Shows destination
   • Updates every 30 seconds

2. DELIVERY INFO:
   • Order number
   • Items being delivered
   • Driver details
   • ETA
   • Status updates

3. ACTIONS:
   • Call driver
   • Message driver
   • Share location
   • View order details

4. STATUS TIMELINE:
   ✓ Order Placed
   ✓ Order Confirmed
   ✓ Items Ready
   ● In Transit  ← Current
   ○ Delivered
```

---

### **Page 7: Monitoring (Live Cameras)**

**URL:** `/monitoring`

**Purpose:** View construction site cameras

**User Flow:**
```
Page Shows:
  • Grid of camera feeds
  • Camera selection
  • Playback controls
  • Recording options
         │
         ↓
USER ACTIONS:

1. VIEW LIVE FEED:
   Click camera → Full-screen view
   → Live streaming video

2. PLAYBACK:
   Select date/time
   → View recorded footage

3. CONTROLS:
   • Pan camera (if PTZ)
   • Zoom in/out
   • Take snapshot
   • Download video

4. MANAGE CAMERAS:
   • Add new camera
   • Edit camera settings
   • Set recording schedule
```

---

### **Page 8: Scanners (QR/Barcode)**

**URL:** `/scanners`

**Purpose:** Scan QR codes for tracking

**User Flow:**
```
Camera Permission Requested
         │
         ↓
Camera Activated
         │
         ↓
Scan Options:
  • Order QR
  • Product Barcode
  • Delivery QR
  • Invoice QR
         │
         ↓
Point camera at QR code
         │
         ↓
QR Detected
         │
         ├─► Vibration feedback
         ├─► Beep sound
         └─► Visual confirmation
         │
         ↓
Data Displayed:
  • Order details
  • Product info
  • Delivery status
  • Actions available
         │
         ↓
ACTIONS:
  • View full details
  • Mark delivered
  • Update status
  • Generate report
```

---

### **Page 9: Feedback**

**URL:** `/feedback`

**Purpose:** Submit feedback and reviews

**User Flow:**
```
Feedback Form:
  • Rating (1-5 stars)
  • Category (dropdown)
  • Feedback text
  • Contact preference
  • Attachments (optional)
         │
         ↓
Submit Feedback
         │
         ├─► Stored in database
         ├─► Confirmation email sent
         └─► Admin notified
         │
         ↓
Thank You Page
         │
         ↓
Previous Feedback (if logged in):
  • View submitted feedback
  • Track response status
  • Edit/delete feedback
```

---

### **Page 10: Analytics Dashboard**

**URL:** `/analytics` (Admin/Supplier only)

**Purpose:** Business insights and statistics

**User Flow:**
```
Dashboard Displays:

1. KEY METRICS:
   • Total Revenue
   • Orders (Today/Month/Year)
   • Active Users
   • Conversion Rate

2. CHARTS:
   • Revenue over time (line chart)
   • Orders by category (pie chart)
   • User growth (area chart)
   • Delivery performance (bar chart)

3. TABLES:
   • Top products
   • Recent orders
   • Best suppliers
   • Active deliveries

4. FILTERS:
   • Date range picker
   • Category filter
   • County filter
   • Export options (PDF, CSV)

5. ACTIONS:
   • Download reports
   • Share dashboard
   • Schedule reports
   • Customize view
```

---

## 🔐 Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              AUTHENTICATION WORKFLOW                         │
└──────────────────────────────────────────────────────────────┘

NEW USER REGISTRATION:
══════════════════════

User clicks "Sign Up"
         │
         ↓
/auth page loads (Sign Up tab)
         │
         ↓
Enter credentials:
  • Email
  • Password (min 8 chars)
  • Confirm Password
         │
         ↓
Click "Sign Up"
         │
         ↓
VALIDATION:
  ├─► Email format check
  ├─► Password strength check
  ├─► Passwords match check
  └─► Terms acceptance check
         │
         ↓ [All valid]
Call Supabase Auth:
supabase.auth.signUp({ email, password })
         │
         ↓
Supabase creates auth user
         │
         ├─► User added to auth.users table
         ├─► Verification email sent
         └─► Returns user object + session
         │
         ↓
Store session in:
  • localStorage (persistent)
  • Supabase client (memory)
         │
         ↓
Redirect based on context:
  ├─► First time → /builders/register
  ├─► Supplier → /supplier-onboarding
  └─► General → /home
         │
         ↓
User checks email
         │
         ↓
Clicks verification link
         │
         ↓
Email verified ✓
         │
         ↓
Full account access granted



EXISTING USER LOGIN:
═══════════════════

User clicks "Sign In"
         │
         ↓
/auth page loads (Sign In tab)
         │
         ↓
Enter credentials:
  • Email
  • Password
         │
         ↓
Click "Sign In"
         │
         ↓
Call Supabase Auth:
supabase.auth.signInWithPassword({ email, password })
         │
         ↓
Supabase validates:
  ├─► Check email exists
  ├─► Verify password hash
  └─► Check account status
         │
         ├─► SUCCESS:
         │   ├─► Generate JWT token
         │   ├─► Create session
         │   └─► Return user + session
         │
         └─► FAILURE:
             └─► Return error
                 (Wrong password, user not found, etc.)
         │
         ↓ [SUCCESS]
Store session
         │
         ↓
Fetch user role:
Query: user_roles table WHERE user_id = current_user
         │
         ↓
Redirect based on role:
  ├─► Admin → /admin/dashboard
  ├─► Supplier → /supplier/dashboard
  ├─► Builder → /home
  ├─► Driver → /delivery/dashboard
  └─► Default → /home



PROTECTED ROUTE ACCESS:
══════════════════════

User navigates to protected page (e.g., /analytics)
         │
         ↓
AuthRequired component checks:
         │
         ├─► Check localStorage for session
         ├─► Verify session with Supabase
         └─► Validate JWT token
         │
         ├─► VALID SESSION:
         │   └─► Allow access to page
         │
         └─► INVALID/NO SESSION:
             ├─► Redirect to /auth
             └─► Store intended destination
                 (return after login)



SESSION MANAGEMENT:
══════════════════

Supabase auto-refreshes JWT tokens:
  • Token expires every 1 hour
  • Auto-refresh before expiration
  • Silent in background
         │
         ↓
If refresh fails:
  ├─► Clear local session
  ├─► Redirect to /auth
  └─► Show "Session expired" message



LOGOUT:
══════

User clicks "Sign Out"
         │
         ↓
Call: supabase.auth.signOut()
         │
         ├─► Clear session from Supabase
         ├─► Clear localStorage
         ├─► Clear memory cache
         └─► Revoke JWT token
         │
         ↓
Redirect to /auth
         │
         ↓
Show "Logged out successfully" message



FORGOT PASSWORD:
═══════════════

User clicks "Forgot Password?"
         │
         ↓
/reset-password page
         │
         ↓
Enter email
         │
         ↓
Call: supabase.auth.resetPasswordForEmail(email)
         │
         ↓
Supabase sends reset email with magic link
         │
         ↓
User clicks link in email
         │
         ↓
Redirects to app with reset token
         │
         ↓
Enter new password
         │
         ↓
Call: supabase.auth.updateUser({ password: newPassword })
         │
         ↓
Password updated ✓
         │
         ↓
Redirect to /auth with success message
         │
         ↓
User logs in with new password
```

---

## 🛒 Order Processing Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│              ORDER PROCESSING WORKFLOW                       │
└──────────────────────────────────────────────────────────────┘

STEP 1: BROWSE & SELECT PRODUCTS
═════════════════════════════════

Builder on /suppliers page
         │
         ↓
Filters/searches for materials
         │
         ↓
Clicks on supplier
         │
         ↓
Views product catalog
         │
         ↓
Clicks "Add to Cart" on products
         │
         ├─► Product 1: Cement 50kg x 100 bags
         ├─► Product 2: Steel Bars x 200 pcs
         └─► Product 3: Sand x 10 tonnes
         │
         ↓
Cart state updates (React Context)
cart = {
  items: [
    { id, name, qty, price, supplier_id },
    { id, name, qty, price, supplier_id },
    ...
  ],
  subtotal,
  delivery_fee,
  tax,
  total
}


STEP 2: REVIEW CART & CHECKOUT
══════════════════════════════

User clicks cart icon / "Checkout"
         │
         ↓
/checkout page loads
         │
         ↓
Displays:
  • Cart summary
  • Price breakdown
  • Delivery form
  • Payment options
         │
         ↓
User fills delivery details:
  • Site address
  • Contact person
  • Phone number
  • Preferred date/time
  • Special instructions
         │
         ↓
Selects payment method:
  ○ M-Pesa
  ○ Card
  ○ Bank Transfer
  ○ Cash on Delivery
         │
         ↓
Reviews order total
         │
         ↓
Clicks "Place Order"


STEP 3: ORDER CREATION
══════════════════════

Frontend sends API request:
POST /api/orders/create
Body: {
  user_id,
  supplier_id,
  items: [...],
  delivery_info: {...},
  payment_method,
  total_amount
}
         │
         ↓
Backend (Supabase Edge Function) processes:
         │
         ├─► Validate user authentication
         ├─► Check product availability
         ├─► Calculate final pricing
         ├─► Verify delivery address
         └─► Check payment method
         │
         ↓ [All valid]
Database transaction starts:
         │
         ├─► INSERT into orders table
         │   (Returns order_id: PO-2024-156)
         │
         ├─► INSERT into order_items table
         │   (For each product in cart)
         │
         ├─► UPDATE products stock
         │   (Decrease available quantities)
         │
         └─► INSERT into order_status_history
             (Initial status: PENDING)
         │
         ↓
Generate QR codes:
         │
         ├─► Master Order QR (order details)
         ├─► Individual Item QRs (each product)
         └─► Delivery QR (shipping info)
         │
         ↓
Store QR codes in database:
INSERT into qr_codes table
         │
         ↓
Transaction commits ✓


STEP 4: NOTIFICATIONS
════════════════════

Send notifications:
         │
         ├─► EMAIL to Builder:
         │   Subject: "Order Confirmed #PO-2024-156"
         │   Body: Order summary, QR codes, next steps
         │
         ├─► SMS to Builder:
         │   "Your order #PO-2024-156 for KES 301,600 confirmed. Track at..."
         │
         ├─► EMAIL to Supplier:
         │   Subject: "New Order Received #PO-2024-156"
         │   Body: Order details, customer info, fulfillment deadline
         │
         └─► SMS to Supplier:
             "New order! #PO-2024-156 from John Kamau. Amount: KES 301,600"
         │
         ↓
Real-time updates via WebSocket:
         │
         ├─► Builder dashboard updates
         └─► Supplier dashboard updates


STEP 5: SUPPLIER ACKNOWLEDGMENT
═══════════════════════════════

Supplier receives notification
         │
         ↓
Logs into supplier dashboard
         │
         ↓
Views new order
         │
         ├─► Reviews items
         ├─► Checks inventory
         ├─► Verifies delivery date
         └─► Assesses feasibility
         │
         ↓
Takes action:
         │
         ├─► ACCEPTS ORDER:
         │   └─► Updates status: CONFIRMED
         │       └─► Builder notified
         │
         └─► REJECTS ORDER:
             └─► Provides reason
                 └─► Builder notified + refund


STEP 6: ORDER PREPARATION
═════════════════════════

Supplier accepts order
         │
         ↓
Status: CONFIRMED → PREPARING
         │
         ↓
Warehouse operations:
         │
         ├─► Pick items from inventory
         ├─► Quality check
         ├─► Package items
         ├─► Print QR label stickers
         ├─► Attach labels to packages
         └─► Stage for loading
         │
         ↓
Update status: READY
         │
         ↓
Assign driver/delivery provider
         │
         ↓
Driver notified:
         │
         ├─► Push notification
         ├─► SMS with pickup details
         └─► Email with manifest


STEP 7: LOADING & DISPATCH
══════════════════════════

Driver arrives at warehouse
         │
         ↓
Opens MradiPro Scanner app
         │
         ↓
Scans each item QR code:
         │
         ├─► Item 1 scanned → Verified ✓
         ├─► Item 2 scanned → Verified ✓
         └─► Item 3 scanned → Verified ✓
         │
         ↓
System records:
         │
         ├─► Item IDs
         ├─► Scan timestamps
         ├─► Quantities loaded
         ├─► Photos of items
         └─► Driver signature
         │
         ↓
All items loaded ✓
         │
         ↓
Generate Dispatch Note (auto):
  • Dispatch ID: DN-2024-089
  • All scanned items listed
  • Driver info
  • Vehicle info
  • Departure time
  • QR code for verification
         │
         ↓
Update status: IN_TRANSIT
         │
         ├─► GPS tracking activated
         ├─► Builder notified (SMS + Push)
         └─► ETA calculated


STEP 8: DELIVERY IN TRANSIT
═══════════════════════════

Real-time tracking active:
         │
         ├─► GPS updates every 30s
         ├─► Route displayed on map
         ├─► ETA updates dynamically
         └─► All parties can track
         │
         ↓
Builder can:
         │
         ├─► View live location
         ├─► See driver details
         ├─► Call driver
         └─► Share tracking link
         │
         ↓
Driver navigates to site


STEP 9: DELIVERY AT SITE
════════════════════════

Driver arrives (GPS detected)
         │
         ↓
Auto-notification to builder:
"Your delivery has arrived!"
         │
         ↓
Builder/Site staff scans Dispatch QR
         │
         ↓
Offloading verification:
         │
         ├─► Builder scans each item QR
         ├─► Builder verifies quantity
         ├─► Builder checks condition
         ├─► Take delivery photos
         └─► Mark each as delivered
         │
         ↓
All items verified ✓
         │
         ↓
Builder signs digitally on driver's device
         │
         ↓
Additional photos captured
         │
         ↓
Optional delivery notes added


STEP 10: COMPLETION
══════════════════

Driver confirms completion
         │
         ↓
System processes:
         │
         ├─► Upload all photos
         ├─► Upload signature
         ├─► Update GPS final location
         └─► Record completion timestamp
         │
         ↓
Update status: DELIVERED
         │
         ↓
Generate digital receipt:
  • Order summary
  • All items delivered
  • Timestamps (ordered → delivered)
  • Signatures (driver + builder)
  • Photos
  • GPS coordinates
  • QR codes for records
         │
         ↓
Send receipts:
         │
         ├─► EMAIL to Builder (PDF)
         ├─► EMAIL to Supplier (PDF)
         ├─► EMAIL to Driver (PDF)
         ├─► SMS confirmations (all)
         └─► In-app notifications (all)
         │
         ↓
Process payment:
         │
         ├─► Charge builder (if not prepaid)
         ├─► Pay supplier (minus platform fee)
         └─► Pay driver (delivery fee)
         │
         ↓
Update analytics:
         │
         ├─► Revenue recorded
         ├─► Inventory updated
         ├─► Order history saved
         └─► Performance metrics updated


STEP 11: POST-DELIVERY
══════════════════════

24 hours after delivery:
         │
         ↓
Send feedback request to builder:
"How was your experience with [Supplier]?"
         │
         ↓
Builder can:
         │
         ├─► Rate supplier (1-5 stars)
         ├─► Leave review
         ├─► Report issues
         └─► Request invoice
         │
         ↓
Feedback stored
         │
         ├─► Supplier rating updated
         ├─► Displayed on supplier profile
         └─► Used for platform improvements
         │
         ↓
Builder can reorder:
"Order again from [Supplier]?"
         │
         ↓ [Yes]
Previous order loaded into cart
Quick checkout available


END OF ORDER WORKFLOW ✓
```

---

## 🚚 Delivery Tracking GPS Flow

```
┌──────────────────────────────────────────────────────────────┐
│              GPS TRACKING WORKFLOW                           │
└──────────────────────────────────────────────────────────────┘

ACTIVATION:
══════════

Order status changes to IN_TRANSIT
         │
         ↓
Driver app requests location permission
         │
         ↓
Permission granted
         │
         ↓
GPS tracking activated
         │
         ↓
Initial location recorded:
  • Latitude
  • Longitude
  • Timestamp
  • Accuracy
         │
         ↓
INSERT into delivery_tracking table:
{
  delivery_id,
  lat, lng,
  timestamp,
  status: 'STARTED'
}


REAL-TIME UPDATES:
═════════════════

Every 30 seconds:
         │
         ├─► Get current GPS coordinates
         ├─► Calculate distance to destination
         ├─► Calculate estimated time
         └─► Determine if driver deviated from route
         │
         ↓
UPDATE delivery_tracking table:
  • New coordinates
  • Updated ETA
  • Distance remaining
  • Current speed
         │
         ↓
Trigger WebSocket event:
"location_updated"
         │
         ↓
Builder's /tracking page receives update
         │
         ↓
Map marker moves to new position
ETA updates dynamically


ARRIVAL DETECTION:
═════════════════

Check if driver within 100m of destination
         │
         ↓ [Yes]
Trigger arrival event
         │
         ├─► Update status: ARRIVED
         ├─► Stop ETA calculations
         └─► Send notification to builder:
             "Your delivery has arrived!"
         │
         ↓
Tracking continues (for offloading verification)


COMPLETION:
══════════

Delivery confirmed by both parties
         │
         ↓
Final GPS coordinates recorded
         │
         ↓
Tracking stopped
         │
         ↓
Route history saved:
  • All GPS points
  • Total distance traveled
  • Total time taken
  • Route map (for records)
         │
         ↓
Available in order history for review


OFFLINE HANDLING:
════════════════

If driver loses internet connection:
         │
         ├─► GPS points stored locally (device)
         ├─► Queue for upload
         └─► Show "Tracking paused" to builder
         │
         ↓
When connection restored:
         │
         ├─► Upload queued GPS points (batch)
         ├─► Reconstruct route
         └─► Resume real-time updates


TRACKING PAGE DISPLAY:
═════════════════════

Builder views /tracking page:
         │
         ↓
Map loads (Google Maps / Mapbox)
         │
         ├─► Origin marker (warehouse)
         ├─► Destination marker (site)
         ├─► Current location marker (driver)
         └─► Route line (path taken)
         │
         ↓
Info panel shows:
  • Driver name & photo
  • Vehicle details
  • Phone number (call button)
  • Current status
  • ETA
  • Distance remaining
  • Estimated cost
         │
         ↓
Updates every 30 seconds automatically
```

---

## 💻 Development Workflow

```
┌──────────────────────────────────────────────────────────────┐
│              DEVELOPMENT WORKFLOW                            │
└──────────────────────────────────────────────────────────────┘

SETUP (First Time):
══════════════════

1. Clone repository:
git clone https://github.com/hillarytaley-ops/UjenziPro.git
cd UjenziPro

2. Install dependencies:
npm install
(Installs ~300MB of node_modules)

3. Configure environment:
Create .env.local:
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

4. Start dev server:
npm run dev
→ Opens at http://localhost:5173


DAILY DEVELOPMENT:
═════════════════

1. Start dev server:
npm run dev
         │
         ↓
Vite starts with:
  • Hot Module Replacement (HMR)
  • Fast refresh
  • TypeScript checking
  • ESLint
         │
         ↓
Edit files in src/
         │
         ├─► src/pages/ (Page components)
         ├─► src/components/ (Reusable components)
         ├─► src/hooks/ (Custom hooks)
         ├─► src/utils/ (Utility functions)
         └─► src/integrations/ (API clients)
         │
         ↓
Save file
         │
         ↓
Vite detects change
         │
         ├─► Compiles TypeScript
         ├─► Updates imports
         └─► Injects into browser
         │
         ↓
Browser updates (< 100ms) ⚡
No full page reload needed!


TESTING:
═══════

1. Local testing:
Browser DevTools:
  • Console (check errors)
  • Network (check API calls)
  • Elements (inspect DOM)
  • Application (check storage)

2. Build testing:
npm run build
  → Tests production build
  → Checks for errors
  → Optimizes code
  → Creates dist/ folder

3. Preview production:
npm run preview
  → Serves production build
  → http://localhost:4173
  → Test as end user would see


COMMITTING CHANGES:
══════════════════

1. Check status:
git status
  → See changed files

2. Stage changes:
git add src/pages/NewPage.tsx
git add src/components/NewComponent.tsx
Or: git add . (stage all)

3. Commit:
git commit -m "Add new feature: XYZ"
  → Use clear, descriptive messages

4. Push to GitHub:
git push origin main
  → Uploads to remote repository


DEPLOYMENT:
══════════

Push triggers automatic deployment:
         │
         ↓
GitHub receives push
         │
         ↓
Webhook notifies Vercel
         │
         ↓
Vercel starts build:
  1. Clones repo (10-15s)
  2. Installs deps (30-45s)
  3. Runs: npm run build (45-60s)
  4. Optimizes assets (10-20s)
  5. Deploys to CDN (10-20s)
  6. Updates DNS (30-60s)
         │
         ↓
Live at: https://ujenzipro.vercel.app
Total time: 2-3 minutes ⚡


ROLLBACK (if needed):
════════════════════

If deployment breaks:

Option 1 - Vercel Dashboard:
  1. Go to Deployments
  2. Find previous working deployment
  3. Click "Promote to Production"
  4. Site rolls back (30s)

Option 2 - Git Revert:
  git revert <commit-hash>
  git push origin main
  → Triggers new deployment with reverted changes
```

---

## 📊 Database Schema Overview

```
┌──────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE SCHEMA                        │
└──────────────────────────────────────────────────────────────┘

TABLES:
══════

1. auth.users (Supabase managed)
   ├─ id (UUID, PK)
   ├─ email
   ├─ encrypted_password
   ├─ email_confirmed_at
   ├─ last_sign_in_at
   └─ created_at

2. user_roles
   ├─ id (UUID, PK)
   ├─ user_id (FK → auth.users)
   ├─ role (enum: admin, builder, supplier, driver)
   ├─ status (enum: active, suspended, pending)
   └─ created_at

3. builders
   ├─ id (UUID, PK)
   ├─ user_id (FK → auth.users)
   ├─ full_name
   ├─ company_name
   ├─ nca_registration (nullable)
   ├─ phone_number
   ├─ county
   ├─ specialization
   ├─ rating (decimal)
   └─ created_at

4. suppliers
   ├─ id (UUID, PK)
   ├─ user_id (FK → auth.users)
   ├─ company_name
   ├─ registration_number
   ├─ phone_number
   ├─ address
   ├─ county
   ├─ logo_url
   ├─ rating (decimal)
   ├─ verified (boolean)
   └─ created_at

5. materials / products
   ├─ id (UUID, PK)
   ├─ supplier_id (FK → suppliers)
   ├─ name
   ├─ category
   ├─ description
   ├─ price (decimal)
   ├─ unit (enum: bag, tonne, piece, etc.)
   ├─ stock_quantity
   ├─ min_order_qty
   ├─ images (text[])
   └─ created_at

6. orders / purchase_orders
   ├─ id (UUID, PK)
   ├─ order_number (e.g., PO-2024-156)
   ├─ buyer_id (FK → auth.users)
   ├─ supplier_id (FK → suppliers)
   ├─ status (enum: pending, confirmed, preparing, in_transit, delivered, cancelled)
   ├─ subtotal (decimal)
   ├─ delivery_fee (decimal)
   ├─ tax (decimal)
   ├─ total (decimal)
   ├─ delivery_address
   ├─ delivery_date
   ├─ payment_method
   ├─ payment_status
   └─ created_at

7. order_items
   ├─ id (UUID, PK)
   ├─ order_id (FK → orders)
   ├─ product_id (FK → materials)
   ├─ quantity
   ├─ unit_price
   ├─ subtotal
   └─ qr_code (unique)

8. deliveries
   ├─ id (UUID, PK)
   ├─ order_id (FK → orders)
   ├─ driver_id (FK → auth.users)
   ├─ vehicle_registration
   ├─ status (enum: assigned, in_transit, delivered, cancelled)
   ├─ pickup_address
   ├─ delivery_address
   ├─ pickup_time
   ├─ delivery_time
   ├─ distance_km
   └─ created_at

9. delivery_tracking
   ├─ id (UUID, PK)
   ├─ delivery_id (FK → deliveries)
   ├─ latitude (decimal)
   ├─ longitude (decimal)
   ├─ timestamp
   ├─ speed_kmh
   └─ accuracy_meters

10. qr_codes
    ├─ id (UUID, PK)
    ├─ code (unique)
    ├─ entity_type (enum: order, item, delivery)
    ├─ entity_id (UUID)
    ├─ qr_data (JSONB)
    ├─ scan_count
    └─ created_at

11. qr_scan_events
    ├─ id (UUID, PK)
    ├─ qr_code (FK → qr_codes)
    ├─ scanned_by (FK → auth.users)
    ├─ scan_type (enum: loading, dispatch, delivery)
    ├─ scanned_at
    ├─ location (POINT - GPS)
    └─ scan_data (JSONB)

12. feedback
    ├─ id (UUID, PK)
    ├─ user_id (FK → auth.users)
    ├─ order_id (FK → orders, nullable)
    ├─ supplier_id (FK → suppliers, nullable)
    ├─ rating (integer 1-5)
    ├─ comment (text)
    ├─ category
    └─ created_at

13. notifications
    ├─ id (UUID, PK)
    ├─ user_id (FK → auth.users)
    ├─ type (enum: order, delivery, payment, system)
    ├─ title
    ├─ message
    ├─ read (boolean)
    ├─ action_url (nullable)
    └─ created_at


RELATIONSHIPS:
═════════════

users → user_roles (1:1)
users → builders (1:1)
users → suppliers (1:1)
suppliers → materials (1:many)
users (buyers) → orders (1:many)
suppliers → orders (1:many)
orders → order_items (1:many)
materials → order_items (1:many)
orders → deliveries (1:1)
deliveries → delivery_tracking (1:many)
orders/items/deliveries → qr_codes (1:many)
qr_codes → qr_scan_events (1:many)
users → feedback (1:many)
suppliers → feedback (1:many)
orders → feedback (1:1)
```

---

## 🔄 Data Flow Example: Complete Order

```
USER ACTION → FRONTEND → API → DATABASE → RESPONSE → UPDATE UI

Example: Builder places order
════════════════════════════

1. USER ACTION:
   Builder clicks "Place Order" button on /checkout

2. FRONTEND (React):
   ```typescript
   const handlePlaceOrder = async () => {
     const orderData = {
       user_id: user.id,
       supplier_id: selectedSupplier.id,
       items: cartItems,
       delivery_info: formData,
       total: calculateTotal(),
     };
     
     const { data, error } = await supabase
       .from('orders')
       .insert(orderData)
       .select()
       .single();
     
     if (data) {
       // Success
       router.push(`/order-confirmation/${data.id}`);
     }
   };
   ```

3. API LAYER (Supabase Client):
   - Validates authentication
   - Checks user permissions
   - Sends HTTP POST request to Supabase

4. DATABASE (PostgreSQL):
   BEGIN TRANSACTION;
   
   INSERT INTO orders (...) VALUES (...);
   -- Returns: order_id
   
   INSERT INTO order_items (...) VALUES (...);
   -- For each item in cart
   
   UPDATE materials SET stock_quantity = stock_quantity - ordered_qty;
   -- For each product
   
   INSERT INTO qr_codes (...) VALUES (...);
   -- Generate QR codes
   
   COMMIT;

5. RESPONSE:
   {
     id: "uuid",
     order_number: "PO-2024-156",
     status: "pending",
     total: 301600,
     created_at: "2024-11-20T10:30:00Z"
   }

6. FRONTEND UPDATE:
   - Display success message
   - Clear cart
   - Navigate to order confirmation
   - Show QR codes
   - Update order history

7. SIDE EFFECTS (Async):
   - Send email to builder
   - Send email to supplier
   - Send SMS notifications
   - Create notification records
   - Trigger webhook (if configured)
```

---

## 📥 DOWNLOADABLE DIAGRAMS

I've created comprehensive workflow diagrams above. To save them:

### **Option 1: Save This Document**
```bash
# This file is already saved in your local folder:
C:\Users\User\OneDrive\Desktop\Cursor3\UjenziPro\MRADIPRO_COMPLETE_APP_WORKFLOW.md

# You can:
1. Open in any text editor
2. Print to PDF
3. Convert to PDF using online tools
4. Share with team members
```

### **Option 2: Create Visual Diagrams**
Use these tools to create visual diagrams from the text:

1. **Draw.io** (https://app.diagrams.net)
   - Free, web-based
   - Can import/export
   - Professional diagrams

2. **Mermaid.js** (https://mermaid.live)
   - Text-to-diagram
   - Easy syntax
   - Beautiful outputs

3. **Lucidchart** (https://www.lucidchart.com)
   - Professional tool
   - Templates available
   - Collaboration features

4. **Figma** (https://figma.com)
   - Design tool
   - Free tier available
   - Great for UI workflows

---

## 📱 Your Local Access

**Your MradiPro is running at:**
```
🌐 http://localhost:5174/
```

**Test all pages:**
- Homepage: http://localhost:5174/
- Auth: http://localhost:5174/auth
- Suppliers: http://localhost:5174/suppliers
- Builders: http://localhost:5174/builders
- Delivery: http://localhost:5174/delivery
- Tracking: http://localhost:5174/tracking
- Feedback: http://localhost:5174/feedback
- Scanners: http://localhost:5174/scanners

---

## 📞 Support

Need more details on any specific workflow?

Just ask:
- "Explain [specific feature] in detail"
- "Show me the code for [functionality]"
- "How does [process] work?"
- "Create diagram for [workflow]"

---

**🏗️ MradiPro - Building Kenya's Digital Construction Future! 🇰🇪**

---

*Complete Workflow Documentation*  
*Version: 2.0.0*  
*Last Updated: November 23, 2025*  
*Status: Comprehensive Guide Complete ✅*

