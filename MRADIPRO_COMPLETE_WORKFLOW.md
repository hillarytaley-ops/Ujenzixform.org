# MradiPro Complete Workflow Guide
## From Sign-Up to Service Monitoring

---

## 🎯 Overview

This guide covers the complete MradiPro workflow from initial user registration through purchasing, dispatch, delivery, and ongoing service monitoring.

---

## 📊 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MRADIPRO WORKFLOW                             │
│                    Construction Made Digital                         │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: USER ONBOARDING
═══════════════════════════════════════════════════════════════════════

    ┌───────────────┐
    │   SIGN UP     │
    │   Landing     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Choose Role   │
    │ • Client      │
    │ • Supplier    │
    │ • Contractor  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Enter Details │
    │ • Name/Email  │
    │ • Password    │
    │ • Phone       │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │Email Verified │
    │   (Supabase)  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │  Dashboard    │
    │   Loaded      │
    └───────────────┘


Phase 2: CLIENT PROJECT SETUP
═══════════════════════════════════════════════════════════════════════

    ┌───────────────┐
    │Client Login   │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────────┐
    │ Create New Project    │
    │ • Project Name        │
    │ • Location            │
    │ • Budget              │
    │ • Timeline            │
    │ • Type (Residential)  │
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ Add Project Details   │
    │ • Upload Plans        │
    │ • Add Milestones      │
    │ • Set Phases          │
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────┐
    │  Project Created      │
    │  Status: PLANNING     │
    └───────────────────────┘


Phase 3: MATERIAL PROCUREMENT
═══════════════════════════════════════════════════════════════════════

    ┌──────────────────┐
    │Browse Materials  │
    │  Marketplace     │
    └────────┬─────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Search & Filter                │
    │  • Category (Cement, Steel)     │
    │  • Price Range                  │
    │  • Supplier Rating              │
    │  • Location                     │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  View Supplier Products         │
    │  ┌─────────────────────────┐    │
    │  │ Bamburi Cement          │    │
    │  │ 50kg Bag                │    │
    │  │ KES 800                 │    │
    │  │ ★★★★★ 4.8/5            │    │
    │  │ [Add to Cart]           │    │
    │  └─────────────────────────┘    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Shopping Cart                  │
    │  1. Cement - 100 bags           │
    │  2. Steel Bars - 200 pcs        │
    │  3. Sand - 10 tonnes            │
    │                                 │
    │  Subtotal: KES 250,000          │
    │  [Proceed to Checkout]          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Checkout                       │
    │  • Delivery Address             │
    │  • Delivery Date                │
    │  • Payment Method               │
    │  • Special Instructions         │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Review Order                   │
    │  [Confirm Purchase]             │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  PURCHASE ORDER CREATED         │
    │  PO #: PO-2024-001              │
    │  Status: PENDING                │
    └─────────────────────────────────┘


Phase 4: SUPPLIER ORDER PROCESSING
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Supplier Receives Order        │
    │  Notification: New Order!       │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Review Order Details           │
    │  • Items & Quantities           │
    │  • Delivery Requirements        │
    │  • Client Information           │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Accept or Reject Order         │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  [ACCEPT] ──────────────────┐   │
    │  Status: CONFIRMED          │   │
    └────────┬────────────────────┴───┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Prepare Order                  │
    │  • Check Stock                  │
    │  • Package Items                │
    │  • Generate Invoice             │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Ready for Dispatch             │
    │  Status: READY_TO_SHIP          │
    └─────────────────────────────────┘


Phase 5: DISPATCH & DELIVERY
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Schedule Delivery              │
    │  • Assign Driver                │
    │  • Assign Vehicle               │
    │  • Set Departure Time           │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Create Delivery Note           │
    │  DN #: DN-2024-001              │
    │  • Items List                   │
    │  • Quantities                   │
    │  • Delivery Address             │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  DISPATCH ORDER                 │
    │  Status: IN_TRANSIT             │
    │  📍 Real-time GPS Tracking      │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Live Tracking Map              │
    │  ┌─────────────────────────┐    │
    │  │     🚚 ← Vehicle        │    │
    │  │      │                  │    │
    │  │      ↓                  │    │
    │  │     📍 Destination      │    │
    │  │                         │    │
    │  │  ETA: 45 minutes        │    │
    │  └─────────────────────────┘    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Arrive at Site                 │
    │  Driver: Mark as Arrived        │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Offload Materials              │
    │  • Client Inspection            │
    │  • Verify Quantities            │
    │  • Check Quality                │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Digital Signature Capture      │
    │  ┌─────────────────────────┐    │
    │  │ [Signature Pad]         │    │
    │  │                         │    │
    │  │  Client Name: _______   │    │
    │  │  Date: 20/11/2024       │    │
    │  └─────────────────────────┘    │
    │  [Confirm Receipt]              │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  DELIVERY COMPLETED             │
    │  Status: DELIVERED              │
    │  Timestamp: Recorded            │
    └─────────────────────────────────┘


Phase 6: RECEIVABLES & PAYMENTS
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Invoice Generated              │
    │  INV #: INV-2024-001            │
    │  ┌─────────────────────────┐    │
    │  │ Order Total: 250,000    │    │
    │  │ Delivery Fee: 5,000     │    │
    │  │ Tax (16%): 40,800       │    │
    │  │ ─────────────────────   │    │
    │  │ TOTAL: KES 295,800      │    │
    │  └─────────────────────────┘    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Payment Options                │
    │  • M-Pesa (Instant)             │
    │  • Bank Transfer                │
    │  • Credit Terms (30/60 days)    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  [M-PESA Selected]              │
    │  ┌─────────────────────────┐    │
    │  │ Enter M-Pesa Number     │    │
    │  │ 0712 XXX XXX            │    │
    │  │                         │    │
    │  │ [Send STK Push]         │    │
    │  └─────────────────────────┘    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Processing Payment             │
    │  • STK Push Sent                │
    │  • Awaiting Confirmation        │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  PAYMENT CONFIRMED              │
    │  ✓ Transaction ID: ABC123       │
    │  ✓ Amount: KES 295,800          │
    │  ✓ Status: PAID                 │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  Receipt Generated & Emailed    │
    │  Supplier Account Updated       │
    └─────────────────────────────────┘


Phase 7: PROJECT MONITORING
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Client Dashboard               │
    │  Project Overview               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  PROJECT TIMELINE                                       │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │                                                 │    │
    │  │  Foundation ████████░░ 80% Complete            │    │
    │  │  Structure  ████░░░░░░ 40% Complete            │    │
    │  │  Finishing  ░░░░░░░░░░  0% Complete            │    │
    │  │                                                 │    │
    │  │  Overall Progress: 55%                         │    │
    │  │  ████████████████░░░░░░░░░░░░░░░░░░░░          │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  BUDGET TRACKING                                        │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Total Budget:      KES 5,000,000              │    │
    │  │  Spent to Date:     KES 2,750,000              │    │
    │  │  Remaining:         KES 2,250,000              │    │
    │  │                                                 │    │
    │  │  [Budget Chart]                                │    │
    │  │  ┌──────────────────────────────┐              │    │
    │  │  │ Materials: 55% ████████████  │              │    │
    │  │  │ Labor:     30% ███████       │              │    │
    │  │  │ Equipment: 10% ███           │              │    │
    │  │  │ Other:      5% █             │              │    │
    │  │  └──────────────────────────────┘              │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  MATERIAL INVENTORY                                     │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Item          Ordered  Delivered  On Site     │    │
    │  │  ─────────────────────────────────────────────  │    │
    │  │  Cement        100      100        45          │    │
    │  │  Steel Bars    200      200        180         │    │
    │  │  Sand (tons)   10       10         7           │    │
    │  │  Bricks        5000     5000       4200        │    │
    │  │                                                 │    │
    │  │  🔔 Alert: Cement running low!                 │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  TEAM & CONTRACTORS                                     │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Active Workers: 12                            │    │
    │  │  • Masons: 4                                   │    │
    │  │  • Carpenters: 3                               │    │
    │  │  • Electricians: 2                             │    │
    │  │  • Plumbers: 2                                 │    │
    │  │  • Supervisor: 1                               │    │
    │  │                                                 │    │
    │  │  [View Attendance] [View Payroll]              │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  SITE PHOTOS & UPDATES                                  │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  [Photo Gallery]                               │    │
    │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │    │
    │  │  │Photo1│ │Photo2│ │Photo3│ │Photo4│          │    │
    │  │  └──────┘ └──────┘ └──────┘ └──────┘          │    │
    │  │                                                 │    │
    │  │  Latest Update (18/11/2024):                   │    │
    │  │  "Foundation work completed ahead of           │    │
    │  │   schedule. Starting ground floor slab."       │    │
    │  │                                                 │    │
    │  │  [Upload Photos] [Add Update]                  │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘


Phase 8: QUALITY & SAFETY MONITORING
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Quality Inspections            │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  INSPECTION CHECKLIST                                   │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Foundation Quality                             │    │
    │  │  ✓ Depth verification                           │    │
    │  │  ✓ Concrete strength                            │    │
    │  │  ✓ Reinforcement placement                      │    │
    │  │  ✓ Curing process                               │    │
    │  │                                                 │    │
    │  │  Inspector: John Kamau                         │    │
    │  │  Date: 15/11/2024                              │    │
    │  │  Status: PASSED ✓                              │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  SAFETY COMPLIANCE                                      │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Safety Score: 92/100                          │    │
    │  │                                                 │    │
    │  │  ✓ PPE Usage                                   │    │
    │  │  ✓ Scaffolding Secure                          │    │
    │  │  ✓ Fire Safety Equipment                       │    │
    │  │  ⚠ First Aid Kit (Needs Restocking)           │    │
    │  │                                                 │    │
    │  │  Last Safety Audit: 18/11/2024                 │    │
    │  │  Next Audit: 25/11/2024                        │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  INCIDENT REPORTING                                     │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Open Incidents: 0                             │    │
    │  │  Closed Incidents: 2                           │    │
    │  │                                                 │    │
    │  │  [Report New Incident]                         │    │
    │  │  [View Incident History]                       │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘


Phase 9: ANALYTICS & REPORTING
═══════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────┐
    │  Generate Reports               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  REPORT OPTIONS                                         │
    │  • Project Status Report                                │
    │  • Financial Summary                                    │
    │  • Material Usage Report                                │
    │  • Labor Hours Report                                   │
    │  • Safety Compliance Report                             │
    │  • Progress Photos Report                               │
    └────────┬────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  AUTOMATED INSIGHTS                                     │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  📊 AI-Powered Analytics                       │    │
    │  │                                                 │    │
    │  │  ✓ Project is 5% ahead of schedule            │    │
    │  │  ⚠ Material costs 8% over budget              │    │
    │  │  ✓ Labor productivity: Excellent               │    │
    │  │  📈 Completion forecast: 2 weeks early        │    │
    │  │                                                 │    │
    │  │  Recommendations:                              │    │
    │  │  • Reorder cement in 3 days                    │    │
    │  │  • Consider bulk discount for steel            │    │
    │  │  • Schedule next inspection                    │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  STAKEHOLDER COMMUNICATION                              │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │  Weekly Report Email                           │    │
    │  │  Recipients:                                    │    │
    │  │  • Project Owner                               │    │
    │  │  • Architect                                   │    │
    │  │  • Main Contractor                             │    │
    │  │  • Investors                                   │    │
    │  │                                                 │    │
    │  │  [Preview] [Send Report]                       │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘

```

---

## 🔄 Complete System Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     MRADIPRO ECOSYSTEM                             │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   CLIENT    │         │  SUPPLIER   │         │ CONTRACTOR  │
│             │         │             │         │             │
│ • Projects  │         │ • Products  │         │ • Services  │
│ • Orders    │◄───────►│ • Orders    │◄───────►│ • Tasks     │
│ • Payments  │         │ • Inventory │         │ • Reports   │
│ • Reports   │         │ • Delivery  │         │ • Timesheet │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   MRADIPRO PLATFORM  │
                    │   (React + Supabase) │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │ Database  │  │  Storage  │  │ Real-time │
        │ (Postgres)│  │  (Files)  │  │ (Updates) │
        └───────────┘  └───────────┘  └───────────┘
```

---

## 📋 Detailed Step-by-Step Workflows

### 1️⃣ SIGN-UP PROCESS

```
Step 1: Landing Page
┌────────────────────────────────────┐
│      Welcome to MradiPro           │
│   Construction Made Digital        │
│                                    │
│   [Get Started] [Sign In]          │
└────────────────────────────────────┘
                │
                ▼
Step 2: Role Selection
┌────────────────────────────────────┐
│      Who are you?                  │
│                                    │
│   ┌──────────┐  ┌──────────┐     │
│   │  CLIENT  │  │ SUPPLIER │     │
│   └──────────┘  └──────────┘     │
│   ┌──────────┐                    │
│   │CONTRACTOR│                    │
│   └──────────┘                    │
└────────────────────────────────────┘
                │
                ▼
Step 3: Registration Form
┌────────────────────────────────────┐
│   Full Name: ___________________   │
│   Email:     ___________________   │
│   Phone:     ___________________   │
│   Password:  ___________________   │
│   Confirm:   ___________________   │
│                                    │
│   [Create Account]                 │
└────────────────────────────────────┘
                │
                ▼
Step 4: Email Verification
┌────────────────────────────────────┐
│   📧 Check your email!             │
│                                    │
│   We sent a verification link to:  │
│   user@example.com                 │
│                                    │
│   [Resend Email]                   │
└────────────────────────────────────┘
                │
                ▼
Step 5: Welcome Dashboard
┌────────────────────────────────────┐
│   Welcome, John! 👋                │
│                                    │
│   Let's get started...             │
│   [Complete Your Profile]          │
└────────────────────────────────────┘
```

**Technical Implementation:**
- **Frontend:** React component at `src/pages/auth/SignUp.tsx`
- **Backend:** Supabase Auth API
- **Database:** `profiles` table auto-created on sign-up
- **Email:** Supabase email templates
- **Validation:** Zod schema validation

---

### 2️⃣ PURCHASE ORDER WORKFLOW

```
CLIENT SIDE                        SUPPLIER SIDE
═══════════════                    ═══════════════

Browse Products                    
     │                             
     ▼                             
Add to Cart                        
     │                             
     ▼                             
Review Cart                        
     │                             
     ▼                             
Enter Delivery Details             
     │                             
     ▼                             
Confirm Order ─────────────────────► Receive Notification
     │                                   │
     ▼                                   ▼
Order Placed                        Review Order
(Status: PENDING)                        │
     │                                   ▼
     │                              Accept Order
     │                                   │
     ▼                                   ▼
Receive Confirmation ◄─────────────Set as Confirmed
     │                             (Status: CONFIRMED)
     ▼                                   │
Track Order                              ▼
     │                              Prepare Items
     │                                   │
     ▼                                   ▼
Real-time Updates ◄──────────────── Ready to Ship
     │                             (Status: READY_TO_SHIP)
     ▼                                   │
Delivery Notification                    ▼
     │                              Assign Driver
     │                                   │
     ▼                                   ▼
Receive Materials ◄──────────────── Dispatch Order
     │                             (Status: IN_TRANSIT)
     ▼                                   │
Sign Delivery Note                       │
     │                                   ▼
     ▼                              Mark as Delivered
Confirm Receipt ────────────────► Update Status
     │                             (Status: DELIVERED)
     ▼                                   │
Rate & Review                            ▼
                                   Record in System
```

**Key Database Tables:**
- `purchase_orders` - Main order records
- `purchase_order_items` - Individual line items
- `deliveries` - Delivery tracking
- `delivery_signatures` - Digital signatures

---

### 3️⃣ DISPATCH & TRACKING WORKFLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPATCH TIMELINE                        │
└─────────────────────────────────────────────────────────────┘

08:00 AM │ Order confirmed & packaged
         │ ✓ Items checked
         │ ✓ Invoice generated
         │
09:00 AM │ Driver assigned
         │ Driver: James Mwangi
         │ Vehicle: KBX 123A
         │ Phone: 0712 XXX XXX
         │
09:30 AM │ 🚚 Departed warehouse
         │ Status: IN_TRANSIT
         │ GPS tracking active
         │
10:15 AM │ 📍 Location update
         │ Current: Thika Road
         │ Distance remaining: 12 km
         │ ETA: 10:45 AM
         │
10:45 AM │ 📍 Arrived at site
         │ Status: ARRIVED
         │ Notification sent to client
         │
11:00 AM │ 📦 Offloading materials
         │ Client inspection in progress
         │
11:30 AM │ ✍️ Signature captured
         │ Client: Jane Wanjiku
         │ Quality: Confirmed
         │
11:35 AM │ ✅ DELIVERY COMPLETE
         │ All items delivered
         │ Photos uploaded
         │ Receipt emailed
```

**Real-Time Tracking Features:**
- GPS location updates every 30 seconds
- Live map with estimated route
- Push notifications at key milestones
- Two-way chat between driver & client
- Photo capture at delivery
- Digital signature on mobile

---

### 4️⃣ RECEIVABLES & PAYMENT FLOW

```
┌──────────────────────────────────────────────────────────┐
│                 PAYMENT PROCESSING FLOW                  │
└──────────────────────────────────────────────────────────┘

INVOICE GENERATION
══════════════════
Delivery Completed
        │
        ▼
System Auto-generates Invoice
        │
        ├─► Invoice Number: INV-2024-001
        ├─► Due Date: Set based on terms
        ├─► Line Items: All order items
        ├─► Taxes: Calculated (16% VAT)
        └─► Total: Final amount
        │
        ▼
Email Sent to Client
        │
        ├─► PDF Attachment
        ├─► Payment Link
        └─► Payment Instructions


PAYMENT OPTIONS
═══════════════
        │
        ├─► M-PESA (Instant)
        │   └─► STK Push to phone
        │       └─► Enter PIN
        │           └─► Confirm payment
        │               └─► Instant verification
        │
        ├─► Bank Transfer
        │   └─► Bank details provided
        │       └─► Make transfer
        │           └─► Upload proof
        │               └─► Manual verification
        │
        └─► Credit Terms
            └─► 30/60/90 days
                └─► Approved clients only
                    └─► Payment reminder sent
                        └─► Auto-follow-up


M-PESA INTEGRATION
══════════════════
Client Selects M-Pesa
        │
        ▼
Enter Phone Number
        │
        ▼
System Initiates STK Push
        │
        ▼
Client Receives Prompt on Phone
        │
        ├─► Enter M-Pesa PIN
        └─► Confirm amount
        │
        ▼
Daraja API Processes
        │
        ├─► Validation
        ├─► Debit account
        └─► Credit merchant
        │
        ▼
Callback Received
        │
        ├─► Transaction ID
        ├─► Amount
        └─► Timestamp
        │
        ▼
Update Database
        │
        ├─► Mark invoice as PAID
        ├─► Record transaction
        └─► Update accounts
        │
        ▼
Send Confirmation
        │
        ├─► SMS receipt
        ├─► Email receipt
        └─► In-app notification


PAYMENT RECONCILIATION
═══════════════════════
Daily Batch Process
        │
        ▼
Match Payments to Invoices
        │
        ├─► Auto-match by reference
        ├─► Flag unmatched
        └─► Resolve discrepancies
        │
        ▼
Update Financial Reports
        │
        ├─► Cash flow statement
        ├─► Accounts receivable
        └─► Profit & loss
```

**Payment Status States:**
- `UNPAID` - Invoice generated, awaiting payment
- `PENDING` - Payment initiated, processing
- `PAID` - Payment confirmed and received
- `PARTIAL` - Partial payment received
- `OVERDUE` - Payment past due date
- `CANCELLED` - Invoice cancelled

---

### 5️⃣ PROJECT MONITORING DASHBOARD

```
┌────────────────────────────────────────────────────────────────┐
│                   PROJECT CONTROL CENTER                       │
│  Villa Construction - Kilimani, Nairobi                        │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌──────────────────────────────────┐
│   OVERALL PROGRESS      │  │   TIMELINE                       │
│                         │  │                                  │
│        65%              │  │   Start: 01 Nov 2024            │
│   █████████████░░░░░    │  │   End:   28 Feb 2025            │
│                         │  │   Elapsed: 20 days              │
│   On Schedule ✓         │  │   Remaining: 100 days           │
│   Status: ACTIVE        │  │                                  │
└─────────────────────────┘  └──────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│   PHASE BREAKDOWN                                              │
│                                                                │
│   1. Foundation        [████████████] 100% ✓ COMPLETE         │
│   2. Ground Floor      [████████░░░░]  80%  IN PROGRESS       │
│   3. First Floor       [███░░░░░░░░░]  30%  IN PROGRESS       │
│   4. Roofing           [░░░░░░░░░░░░]   0%  PENDING           │
│   5. Finishing         [░░░░░░░░░░░░]   0%  PENDING           │
│   6. Handover          [░░░░░░░░░░░░]   0%  PENDING           │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────────────────────┐
│  BUDGET STATUS       │  │  TEAM PERFORMANCE                    │
│                      │  │                                      │
│  Total: 5.0M KES     │  │  Active Workers: 15                 │
│  Spent: 2.8M KES     │  │  Productivity: 94% ▲                │
│  Remain: 2.2M KES    │  │  Attendance: 98%                    │
│                      │  │  Safety Score: 92/100               │
│  [Budget Chart]      │  │                                      │
│  ┌────────────────┐  │  │  Top Performers:                    │
│  │ ███ Materials  │  │  │  1. Joseph Kariuki (Mason)          │
│  │ ██  Labor      │  │  │  2. Peter Kimani (Carpenter)        │
│  │ █   Equipment  │  │  │  3. David Omondi (Electrician)      │
│  └────────────────┘  │  │                                      │
└──────────────────────┘  └──────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│   MATERIAL INVENTORY STATUS                                    │
│                                                                │
│   Item              Ordered   Delivered   Used    Remaining   │
│   ────────────────────────────────────────────────────────    │
│   Cement (50kg)      200       200       145      55  ⚠       │
│   Steel Bars (12mm)  300       300       280      20  ⚠       │
│   Sand (tonnes)      15        15        10       5   ✓       │
│   Ballast (tonnes)   20        20        14       6   ✓       │
│   Bricks (pcs)       8000      8000      6500     1500 ✓       │
│   Timber (pcs)       150       150       100      50  ✓       │
│                                                                │
│   ⚠ 2 items running low - Reorder recommended                 │
│   [Generate Reorder List]                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│   RECENT ACTIVITIES                        UPCOMING MILESTONES │
│                                                                │
│   Today, 10:30 AM                          Tomorrow:           │
│   ✓ First floor slab poured                • Inspection       │
│                                                                │
│   Today, 09:15 AM                          Next Week:          │
│   ✓ Steel delivery received                • Start roofing    │
│                                                                │
│   Yesterday, 4:00 PM                       This Month:         │
│   ✓ Electrical conduits installed          • Complete 1st flr │
│                                                                │
│   [View All Activities]                    [View Schedule]     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│   SITE PHOTOS (Latest)                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│   │          │ │          │ │          │ │          │        │
│   │  Photo1  │ │  Photo2  │ │  Photo3  │ │  Photo4  │        │
│   │ 20/11/24 │ │ 19/11/24 │ │ 18/11/24 │ │ 17/11/24 │        │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│   [Upload New Photos] [View Gallery]                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│   QUICK ACTIONS                                                │
│   [Create Task] [Order Materials] [Generate Report]           │
│   [Schedule Inspection] [Add Team Member] [View Financials]   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features by User Role

### 👤 CLIENT FEATURES

```
DASHBOARD
├── Project Overview
├── Budget Tracking
├── Progress Monitoring
├── Document Management
└── Communication Hub

PROJECTS
├── Create New Project
├── Set Budget & Timeline
├── Upload Plans/Drawings
├── Track Milestones
└── Generate Reports

PROCUREMENT
├── Browse Materials Marketplace
├── Compare Suppliers
├── Place Orders
├── Track Deliveries
└── Manage Invoices

TEAM MANAGEMENT
├── Invite Contractors
├── Assign Tasks
├── Track Progress
├── Review Performance
└── Manage Payments

REPORTING
├── Progress Reports
├── Financial Reports
├── Material Usage
├── Safety Reports
└── Custom Reports
```

### 🏪 SUPPLIER FEATURES

```
DASHBOARD
├── Order Management
├── Inventory Overview
├── Sales Analytics
├── Payment Tracking
└── Delivery Schedule

PRODUCTS
├── Add New Products
├── Upload Images
├── Set Pricing
├── Manage Stock
└── Product Categories

ORDERS
├── Receive New Orders
├── Accept/Reject Orders
├── Process Orders
├── Generate Invoices
└── Track Payments

DELIVERY
├── Schedule Deliveries
├── Assign Drivers
├── Track Vehicles (GPS)
├── Capture Signatures
└── Upload Photos

ANALYTICS
├── Sales Reports
├── Top Products
├── Customer Insights
├── Revenue Tracking
└── Performance Metrics
```

### 👷 CONTRACTOR FEATURES

```
DASHBOARD
├── Active Projects
├── Task List
├── Team Overview
├── Equipment Status
└── Safety Alerts

PROJECTS
├── View Assigned Projects
├── Update Progress
├── Upload Photos
├── Report Issues
└── Submit Timesheets

TEAM
├── View Team Members
├── Track Attendance
├── Assign Tasks
├── Monitor Performance
└── Safety Training

EQUIPMENT
├── Equipment Inventory
├── Maintenance Schedule
├── Usage Tracking
├── Repair Requests
└── Equipment Status

REPORTING
├── Daily Progress Reports
├── Safety Reports
├── Material Usage
├── Labor Hours
└── Issue Reports
```

---

## 🔐 Security & Authentication Flow

```
┌────────────────────────────────────────────────────────────┐
│               AUTHENTICATION FLOW                          │
└────────────────────────────────────────────────────────────┘

User Enters Credentials
         │
         ▼
Frontend Validation
         │
         ├─► Email format check
         ├─► Password strength
         └─► Required fields
         │
         ▼
Send to Supabase Auth
         │
         ├─► POST /auth/v1/token
         └─► Include credentials
         │
         ▼
Supabase Validates
         │
         ├─► Check user exists
         ├─► Verify password hash
         └─► Check email verified
         │
         ├─► [SUCCESS] ─────────────┐
         │                          │
         └─► [FAILURE] ──────────┐  │
                                 │  │
                          Return Error │
                          Show Message │
                                      │
                                      ▼
                          Generate JWT Token
                                      │
                                      ├─► Access Token
                                      ├─► Refresh Token
                                      └─► User Metadata
                                      │
                                      ▼
                          Store in LocalStorage
                                      │
                                      ├─► supabase.auth.token
                                      └─► Expires in 1 hour
                                      │
                                      ▼
                          Fetch User Profile
                                      │
                                      ├─► Query profiles table
                                      ├─► Get user role
                                      └─► Get permissions
                                      │
                                      ▼
                          Redirect to Dashboard
                                      │
                                      ├─► Client Dashboard
                                      ├─► Supplier Dashboard
                                      └─► Contractor Dashboard


PROTECTED ROUTES
════════════════
Each Page Load
         │
         ▼
Check Auth State
         │
         ├─► Token exists?
         ├─► Token valid?
         └─► Token expired?
         │
         ├─► [VALID] ────────────► Allow Access
         │
         └─► [INVALID] ──────────► Redirect to Login


API REQUESTS
════════════
Making API Call
         │
         ▼
Add Authorization Header
         │
         └─► Authorization: Bearer {token}
         │
         ▼
Supabase Validates Token
         │
         ├─► [VALID] ────────────► Process Request
         │
         └─► [INVALID] ──────────► Return 401 Error


ROW LEVEL SECURITY (RLS)
════════════════════════
Database Query
         │
         ▼
Extract JWT Claims
         │
         ├─► user_id
         ├─► user_role
         └─► email
         │
         ▼
Apply RLS Policies
         │
         ├─► Check ownership (user_id)
         ├─► Check role permissions
         └─► Filter results
         │
         ▼
Return Authorized Data Only
```

---

## 📱 Mobile App Flow

```
┌────────────────────────────────────────────────────────────┐
│             MOBILE APP NAVIGATION                          │
└────────────────────────────────────────────────────────────┘

SPLASH SCREEN
      │
      ▼
Check Auth Status
      │
      ├─► [AUTHENTICATED] ──────► Dashboard
      │
      └─► [NOT AUTHENTICATED] ──► Welcome Screen
                                        │
                                        ├─► Sign In
                                        └─► Sign Up

CLIENT MOBILE DASHBOARD
═══════════════════════
┌────────────────────┐
│  [≡] MradiPro  🔔  │  ← Header with menu & notifications
├────────────────────┤
│                    │
│  My Projects (3)   │  ← Quick project cards
│  ┌──────────────┐  │
│  │ Villa Build  │  │
│  │ 65% Complete │  │
│  └──────────────┘  │
│                    │
│  Quick Actions     │
│  [Order] [Track]   │
│  [Pay] [Report]    │
│                    │
│  Recent Activity   │
│  • Delivery today  │
│  • Payment due     │
│                    │
└────────────────────┘
│   [Home] [Orders]  │  ← Bottom navigation
│   [Projects] [More]│
└────────────────────┘


SUPPLIER MOBILE DASHBOARD
═════════════════════════
┌────────────────────┐
│  [≡] MradiPro  🔔  │
├────────────────────┤
│  New Orders (5) 🔴 │  ← Urgent notifications
│                    │
│  Today's Deliveries│
│  ┌──────────────┐  │
│  │ 8:00 AM      │  │
│  │ Cement - 50kg│  │
│  │ KBX 123A     │  │
│  └──────────────┘  │
│                    │
│  Quick Actions     │
│  [Scan Order]      │  ← QR code scanner
│  [Mark Delivered]  │
│  [Update Stock]    │
│                    │
│  Sales Today       │
│  KES 450,000       │
│  ▲ 15% from avg    │
└────────────────────┘


DELIVERY DRIVER APP
═══════════════════
┌────────────────────┐
│  Today's Route     │
├────────────────────┤
│  🗺️ Map View       │
│  ┌──────────────┐  │
│  │    🚚        │  │  ← Live GPS tracking
│  │     ↓        │  │
│  │    📍1       │  │
│  │    📍2       │  │
│  │    📍3       │  │
│  └──────────────┘  │
│                    │
│  Next Delivery:    │
│  📍 Kilimani       │
│  ETA: 15 mins      │
│  Items: 3          │
│                    │
│  [Navigate]        │
│  [Call Client]     │
│  [Mark Arrived]    │
└────────────────────┘

OFFLINE MODE
════════════
Internet Lost
      │
      ▼
Cache Current Data
      │
      ├─► Store deliveries
      ├─► Store signatures
      └─► Store photos
      │
      ▼
Show Offline Banner
      │
      ▼
Continue Working
      │
      ▼
Internet Restored
      │
      ▼
Sync Cached Data
      │
      └─► Upload to server
```

---

## 📊 Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                         │
└────────────────────────────────────────────────────────────────┘

FRONTEND LAYER
══════════════
┌─────────────────────────────────────────────────────────┐
│  React Application (TypeScript)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Pages   │  │Components│  │  Hooks   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│       └─────────────┴─────────────┘                     │
│                     │                                   │
│              ┌──────┴──────┐                            │
│              │   Context   │  ← State Management       │
│              └──────┬──────┘                            │
│                     │                                   │
│              ┌──────┴──────┐                            │
│              │  API Layer  │  ← Supabase Client        │
│              └──────┬──────┘                            │
└─────────────────────┼──────────────────────────────────┘
                      │
                      ▼
BACKEND LAYER
═════════════
┌─────────────────────────────────────────────────────────┐
│  Supabase Backend                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                             │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │Projects│ │ Orders │ │Products│ │Payments│   │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS)                        │   │
│  │  • User can only see their own data              │   │
│  │  • Suppliers see their orders only               │   │
│  │  • Clients see their projects only               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Storage Buckets                                 │   │
│  │  • Product Images                                │   │
│  │  • Project Documents                             │   │
│  │  • Delivery Photos                               │   │
│  │  • User Avatars                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Real-time Subscriptions                         │   │
│  │  • Order updates                                 │   │
│  │  • Delivery tracking                             │   │
│  │  • Chat messages                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
INTEGRATION LAYER
═════════════════
┌─────────────────────────────────────────────────────────┐
│  External Services                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  M-Pesa  │  │   GPS    │  │  Email   │             │
│  │ Payments │  │ Tracking │  │  (SMTP)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘


DATA FLOW EXAMPLE: Creating a Purchase Order
═══════════════════════════════════════════════

1. User adds items to cart
   │
   ├─► Frontend: Update local state
   └─► No database call yet
   │
2. User clicks "Checkout"
   │
   ├─► Frontend: Navigate to checkout
   └─► Load delivery addresses from DB
   │
3. User confirms order
   │
   ├─► Frontend: Prepare order object
   │   {
   │     supplier_id: "...",
   │     items: [...],
   │     delivery_address: "...",
   │     total: 100000
   │   }
   │
   ├─► API Call: createPurchaseOrder()
   │
   ├─► Backend: Insert into database
   │   INSERT INTO purchase_orders ...
   │   INSERT INTO purchase_order_items ...
   │
   ├─► Backend: Trigger notifications
   │   └─► Send email to supplier
   │   └─► Send SMS to client
   │   └─► Create in-app notification
   │
   ├─► Backend: Return success
   │   └─► Include order ID
   │
   └─► Frontend: Show confirmation
       └─► Redirect to order details
       └─► Clear cart
```

---

## 🎨 User Interface Examples

### Purchase Order Page

```
┌────────────────────────────────────────────────────────────────┐
│  MradiPro                                    🔔 Profile 👤      │
├────────────────────────────────────────────────────────────────┤
│  Home > Orders > Purchase Order #PO-2024-001                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Purchase Order #PO-2024-001                                   │
│  Status: ● IN TRANSIT                                          │
│  Created: 18 Nov 2024, 10:30 AM                                │
│                                                                │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │  Supplier Information    │  │  Delivery Information    │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━  │  │  ━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │  Bamburi Cement Ltd      │  │  Address:                │   │
│  │  📞 0700 123 456         │  │  Kilimani, Plot 123     │   │
│  │  ✉ info@bamburi.com      │  │  Nairobi                │   │
│  │  ⭐ 4.8/5 (234 reviews)  │  │                          │   │
│  └──────────────────────────┘  │  Expected: 20 Nov 2024   │   │
│                                │  Time: 10:00 - 12:00 AM   │   │
│                                └──────────────────────────────┘   │
│                                                                │
│  Order Items                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [Image] Bamburi Cement 50kg Bag                        │   │
│  │         Quantity: 100 bags                             │   │
│  │         Unit Price: KES 800                            │   │
│  │         Subtotal: KES 80,000                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [Image] Steel Reinforcement Bars 12mm                  │   │
│  │         Quantity: 200 pieces                           │   │
│  │         Unit Price: KES 750                            │   │
│  │         Subtotal: KES 150,000                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [Image] Building Sand (Machine Washed)                 │   │
│  │         Quantity: 10 tonnes                            │   │
│  │         Unit Price: KES 2,000                          │   │
│  │         Subtotal: KES 20,000                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  Subtotal:                                    KES 250,000     │
│  Delivery Fee:                                KES   5,000     │
│  VAT (16%):                                   KES  40,800     │
│  ──────────────────────────────────────────────────────────   │
│  TOTAL:                                       KES 295,800     │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Track Order  │  │ Contact      │  │ Download     │       │
│  │    📍        │  │ Supplier 📞  │  │ Invoice 📄   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  Order Timeline                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  ✅ Order Placed        18 Nov, 10:30 AM                      │
│  ✅ Order Confirmed     18 Nov, 11:00 AM                      │
│  ✅ Dispatched          20 Nov, 08:30 AM                      │
│  ⏳ In Transit          Currently                             │
│  ⏺ Delivered           Expected: 20 Nov, 11:00 AM            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Summary

### For Clients:
1. **Sign Up** → Choose "Client" role
2. **Create Project** → Enter project details
3. **Browse Materials** → Search marketplace
4. **Place Order** → Add to cart & checkout
5. **Track Delivery** → Real-time GPS tracking
6. **Receive & Sign** → Digital signature capture
7. **Make Payment** → M-Pesa or bank transfer
8. **Monitor Progress** → Dashboard analytics

### For Suppliers:
1. **Sign Up** → Choose "Supplier" role
2. **Add Products** → Upload catalog with images
3. **Receive Orders** → Email & app notifications
4. **Process Orders** → Accept & prepare items
5. **Dispatch** → Assign driver & vehicle
6. **Track Delivery** → Monitor GPS location
7. **Confirm Receipt** → Get signature
8. **Receive Payment** → Auto-reconciliation

### For Contractors:
1. **Sign Up** → Choose "Contractor" role
2. **Join Project** → Accept invitation
3. **View Tasks** → Daily task list
4. **Update Progress** → Upload photos & notes
5. **Track Team** → Attendance & hours
6. **Submit Reports** → Daily progress reports
7. **Monitor Safety** → Safety checklists
8. **Get Paid** → Invoice submission

---

## 📈 Analytics & Insights

```
BUSINESS INTELLIGENCE DASHBOARD
════════════════════════════════

┌────────────────────────────────────────────────────────────┐
│  Executive Summary                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  This Month (November 2024)                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Total Revenue:        KES 12.5M  ▲ 23%                   │
│  Orders Processed:     147        ▲ 15%                   │
│  Active Projects:      89         ▲ 8%                    │
│  New Users:            234        ▲ 41%                   │
│                                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │  Revenue Trend (Last 6 Months)                   │     │
│  │  ▁▂▃▅▆█ ▆                                        │     │
│  │  M  J  J  A  S  O  N                             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  Top Performing Categories                                 │
│  ┌─────────────────────────────────────────────────┐      │
│  │  1. Cement & Aggregates   35% ████████         │      │
│  │  2. Steel & Metals         28% ███████          │      │
│  │  3. Finishing Materials    18% █████            │      │
│  │  4. Plumbing & Electrical  12% ███              │      │
│  │  5. Tools & Equipment       7% ██               │      │
│  └─────────────────────────────────────────────────┘      │
│                                                            │
│  Customer Satisfaction                                     │
│  ⭐⭐⭐⭐⭐ 4.7/5.0  (1,234 reviews this month)            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Metrics

**Platform Performance:**
- Average page load: < 2 seconds
- Order processing time: < 5 minutes
- Delivery accuracy: 98.5%
- Payment success rate: 99.2%
- Customer satisfaction: 4.7/5

**Growth Metrics:**
- Monthly Active Users: 5,600+
- Registered Suppliers: 340+
- Active Projects: 890+
- Total Transaction Volume: KES 450M+

---

## 📞 Support & Help

**For Clients:**
- 📞 Hotline: 0700 MRADIPRO (0700 672 3477)
- ✉️ Email: support@mradipro.com
- 💬 Live Chat: Available 24/7 in app
- 📚 Help Center: help.mradipro.com

**For Suppliers:**
- 📞 Supplier Support: 0700 SUPPLIER
- ✉️ Email: suppliers@mradipro.com
- 📊 Supplier Portal: portal.mradipro.com

**For Contractors:**
- 📞 Contractor Support: 0700 BUILDERS
- ✉️ Email: contractors@mradipro.com
- 🎓 Training: training.mradipro.com

---

## 🔄 Continuous Improvement

MradiPro is constantly evolving based on user feedback:

- **Weekly Updates:** Bug fixes and minor improvements
- **Monthly Features:** New functionality releases
- **Quarterly Reviews:** Major feature additions
- **Annual Audits:** Security and performance reviews

---

**MradiPro** - *Building Kenya, One Project at a Time* 🏗️🇰🇪

