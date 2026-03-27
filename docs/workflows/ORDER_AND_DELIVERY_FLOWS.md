# 📦 UjenziXform Order & Delivery Workflows

## Overview

This document details the complete order lifecycle from material selection to delivery confirmation.

---

## 1. Order Creation Flow

### 1.1 Material Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│                   MATERIAL DISCOVERY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ENTRY POINTS:                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Home      │  │  Supplier   │  │   Search    │              │
│  │   Page      │  │  Directory  │  │    Bar      │              │
│  │   CTA       │  │   /suppliers│  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                SUPPLIER MARKETPLACE                      │    │
│  │                 (/suppliers)                             │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  FILTER OPTIONS:                                        │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │ Category: [All ▼]  County: [All ▼]  Price: [Any ▼]│  │    │
│  │  │ Rating: [★★★★★]    Delivery: [✓]    In Stock: [✓] │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  MATERIAL CATEGORIES:                                   │    │
│  │  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │    │
│  │  │ Cement  │  Steel  │ Timber  │ Roofing │Plumbing │   │    │
│  │  └─────────┴─────────┴─────────┴─────────┴─────────┘   │    │
│  │                                                         │    │
│  │  MATERIAL GRID:                                         │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │
│  │  │ 📦 Product 1 │ │ 📦 Product 2 │ │ 📦 Product 3 │    │    │
│  │  │ KES 850/bag  │ │ KES 1,200/pc │ │ KES 450/kg   │    │    │
│  │  │ ★★★★☆ (45)   │ │ ★★★★★ (128)  │ │ ★★★☆☆ (23)   │    │    │
│  │  │ [View] [Add] │ │ [View] [Add] │ │ [View] [Add] │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Quote Request Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUOTE REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INITIATE QUOTE REQUEST                                      │
│     Builder clicks "Request Quote" on supplier/product          │
│                          │                                      │
│                          ▼                                      │
│  2. QUOTE REQUEST MODAL (QuoteRequestModal)                     │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  📋 REQUEST QUOTE FROM: ABC Hardware                │     │
│     │  ─────────────────────────────────────────────────  │     │
│     │                                                     │     │
│     │  ITEMS:                                             │     │
│     │  ┌─────────────────────────────────────────────┐   │     │
│     │  │ Product          │ Qty  │ Unit │ Est. Price │   │     │
│     │  ├─────────────────────────────────────────────┤   │     │
│     │  │ Portland Cement  │ 100  │ bags │ KES 85,000 │   │     │
│     │  │ 12mm Rebar       │ 50   │ pcs  │ KES 60,000 │   │     │
│     │  │ River Sand       │ 10   │ tons │ KES 25,000 │   │     │
│     │  └─────────────────────────────────────────────┘   │     │
│     │                                                     │     │
│     │  DELIVERY DETAILS:                                  │     │
│     │  📍 Location: [Nairobi, Westlands        ▼]        │     │
│     │  📅 Needed by: [Select Date           📅]          │     │
│     │  📝 Notes: [                              ]         │     │
│     │                                                     │     │
│     │  Estimated Total: KES 170,000                       │     │
│     │                                                     │     │
│     │  [Cancel]                    [Submit Quote Request] │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  3. QUOTE SUBMITTED                                             │
│     • Request saved to database                                 │
│     • Supplier notified (push, email, SMS)                      │
│     • Builder sees "Quote Pending" status                       │
│                          │                                      │
│                          ▼                                      │
│  4. SUPPLIER REVIEWS (1-24 hours typical)                       │
│     Supplier checks:                                            │
│     • Stock availability                                        │
│     • Delivery feasibility                                      │
│     • Pricing (may adjust based on quantity)                    │
│                          │                                      │
│                          ▼                                      │
│  5. SUPPLIER RESPONDS                                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ Option A: ACCEPT                                    │     │
│     │ • Confirm prices                                    │     │
│     │ • Specify delivery date                             │     │
│     │ • Add any conditions                                │     │
│     ├─────────────────────────────────────────────────────┤     │
│     │ Option B: COUNTER-OFFER                             │     │
│     │ • Adjust prices                                     │     │
│     │ • Suggest alternatives                              │     │
│     │ • Propose different delivery                        │     │
│     ├─────────────────────────────────────────────────────┤     │
│     │ Option C: DECLINE                                   │     │
│     │ • Provide reason                                    │     │
│     │ • Suggest alternatives                              │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  6. BUILDER RECEIVES QUOTE                                      │
│     • Notification sent                                         │
│     • Quote visible in dashboard                                │
│     • Valid for 7 days (configurable)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Order Confirmation

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORDER CONFIRMATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BUILDER REVIEWS QUOTE                                       │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  QUOTE #QT-2025-001234                              │     │
│     │  From: ABC Hardware Ltd                             │     │
│     │  Valid Until: Dec 10, 2025                          │     │
│     │                                                     │     │
│     │  ┌─────────────────────────────────────────────┐   │     │
│     │  │ Item             │ Qty │ Price   │ Total    │   │     │
│     │  ├─────────────────────────────────────────────┤   │     │
│     │  │ Portland Cement  │ 100 │ KES 820 │ KES 82,000│  │     │
│     │  │ 12mm Rebar       │ 50  │ KES 1,150│ KES 57,500│ │     │
│     │  │ River Sand       │ 10  │ KES 2,400│ KES 24,000│ │     │
│     │  ├─────────────────────────────────────────────┤   │     │
│     │  │ Subtotal                        │ KES 163,500│  │     │
│     │  │ Delivery Fee                    │ KES 5,000  │  │     │
│     │  │ VAT (16%)                       │ KES 26,960 │  │     │
│     │  │ TOTAL                           │ KES 195,460│  │     │
│     │  └─────────────────────────────────────────────┘   │     │
│     │                                                     │     │
│     │  Delivery: Dec 5, 2025 (Morning)                    │     │
│     │  Location: Site XYZ, Westlands, Nairobi             │     │
│     │                                                     │     │
│     │  [Request Changes]  [Decline]  [Accept & Pay →]     │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  2. ACCEPT & PROCEED TO PAYMENT                                 │
│     • Quote converted to Purchase Order                         │
│     • PO number generated (PO-2025-001234)                      │
│     • Payment gateway opens                                     │
│                          │                                      │
│                          ▼                                      │
│  3. PAYMENT PROCESSING                                          │
│     (See Payment Workflow section)                              │
│                          │                                      │
│                          ▼                                      │
│  4. ORDER CONFIRMED                                             │
│     • Order status: "Confirmed"                                 │
│     • Supplier notified                                         │
│     • Builder receives confirmation                             │
│     • Delivery scheduling initiated                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Purchase Order Management

### 2.1 Purchase Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                PURCHASE ORDER STATES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ DRAFT   │───▶│ PENDING │───▶│CONFIRMED│───▶│PROCESSING│     │
│  │         │    │ PAYMENT │    │         │    │         │      │
│  └─────────┘    └────┬────┘    └─────────┘    └────┬────┘      │
│                      │                             │            │
│                      │ Payment                     │ Materials  │
│                      │ Failed                      │ Ready      │
│                      ▼                             ▼            │
│                 ┌─────────┐                   ┌─────────┐       │
│                 │CANCELLED│                   │ READY   │       │
│                 │         │                   │ FOR     │       │
│                 └─────────┘                   │ DISPATCH│       │
│                                               └────┬────┘       │
│                                                    │            │
│                                                    ▼            │
│                                               ┌─────────┐       │
│                                               │DISPATCHED│      │
│                                               │         │       │
│                                               └────┬────┘       │
│                                                    │            │
│                                                    ▼            │
│                                               ┌─────────┐       │
│                                               │IN TRANSIT│      │
│                                               │         │       │
│                                               └────┬────┘       │
│                                                    │            │
│                              ┌─────────────────────┼───────┐    │
│                              │                     │       │    │
│                              ▼                     ▼       ▼    │
│                         ┌─────────┐          ┌─────────┐ ┌────┐ │
│                         │DELIVERED│          │ PARTIAL │ │ISSUE││
│                         │         │          │ DELIVERY│ │    ││
│                         └────┬────┘          └─────────┘ └────┘ │
│                              │                                  │
│                              ▼                                  │
│                         ┌─────────┐                             │
│                         │COMPLETED│                             │
│                         │         │                             │
│                         └─────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Purchase Order Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   PURCHASE ORDER DOCUMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🏗️ UjenziXform                                           │    │
│  │  PURCHASE ORDER                                         │    │
│  │                                                         │    │
│  │  PO Number: PO-2025-001234                              │    │
│  │  Date: December 3, 2025                                 │    │
│  │  Status: CONFIRMED ✓                                    │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  BUYER:                    SUPPLIER:                    │    │
│  │  John Kamau Construction   ABC Hardware Ltd             │    │
│  │  P.O. Box 12345           P.O. Box 54321                │    │
│  │  Nairobi, Kenya           Nairobi, Kenya                │    │
│  │  Tel: +254 712 345 678    Tel: +254 722 987 654         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  DELIVERY TO:                                           │    │
│  │  Site: Greenfield Apartments Project                    │    │
│  │  Address: Plot 123, Westlands Road                      │    │
│  │  County: Nairobi                                        │    │
│  │  GPS: -1.2641, 36.8034                                  │    │
│  │  Contact: Peter Mwangi (+254 711 222 333)               │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  LINE ITEMS:                                            │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ # │ Description      │ Qty │ Unit │ Price │Total│   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ 1 │ Bamburi Cement   │ 100 │ bags │  820  │82,000│  │    │
│  │  │ 2 │ Y12 Rebar 12m    │  50 │ pcs  │ 1,150 │57,500│  │    │
│  │  │ 3 │ River Sand       │  10 │ tons │ 2,400 │24,000│  │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  Subtotal:           KES 163,500                        │    │
│  │  Delivery:           KES   5,000                        │    │
│  │  VAT (16%):          KES  26,960                        │    │
│  │  ─────────────────────────────────                      │    │
│  │  TOTAL:              KES 195,460                        │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  PAYMENT:                                               │    │
│  │  Method: M-Pesa                                         │    │
│  │  Transaction: QK1234ABCD                                │    │
│  │  Status: PAID ✓                                         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  DELIVERY SCHEDULE:                                     │    │
│  │  Expected: December 5, 2025 (8:00 AM - 12:00 PM)        │    │
│  │  Provider: FastTrack Deliveries                         │    │
│  │  Vehicle: KCB 123A                                      │    │
│  │  Driver: James Ochieng (+254 733 444 555)               │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  QR CODE:         TRACKING:                             │    │
│  │  [█▀▀▀▀▀█]       Track this order:                      │    │
│  │  [█ ▄▄▄ █]       ujenzixform.org/track/PO-2025-001234    │    │
│  │  [█▄▄▄▄▄█]                                              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Delivery Workflow

### 3.1 Delivery Scheduling

```
┌─────────────────────────────────────────────────────────────────┐
│                   DELIVERY SCHEDULING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRIGGER: Order status changes to "Ready for Dispatch"          │
│                          │                                      │
│                          ▼                                      │
│  1. AI PROVIDER MATCHING                                        │
│     (useAIProviderMatching hook)                                │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  MATCHING CRITERIA:                                 │     │
│     │  ┌───────────────────────────────────────────────┐ │     │
│     │  │ • Location proximity to pickup     (30%)     │ │     │
│     │  │ • Vehicle capacity match           (25%)     │ │     │
│     │  │ • Provider rating                  (20%)     │ │     │
│     │  │ • Historical performance           (15%)     │ │     │
│     │  │ • Current availability             (10%)     │ │     │
│     │  └───────────────────────────────────────────────┘ │     │
│     │                                                     │     │
│     │  TOP MATCHES:                                       │     │
│     │  1. FastTrack Deliveries - 95% match               │     │
│     │  2. Nairobi Haulers - 87% match                    │     │
│     │  3. Quick Cargo - 82% match                        │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  2. SEND DELIVERY REQUESTS                                      │
│     • Push notification to matched providers                    │
│     • SMS alert sent                                            │
│     • Request visible in provider app                           │
│                          │                                      │
│                          ▼                                      │
│  3. PROVIDER ACCEPTANCE                                         │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  NEW DELIVERY REQUEST                               │     │
│     │  ─────────────────────────────────────────────────  │     │
│     │                                                     │     │
│     │  📦 Order: PO-2025-001234                           │     │
│     │  📍 Pickup: ABC Hardware, Industrial Area           │     │
│     │  📍 Deliver: Westlands, Nairobi                     │     │
│     │  📏 Distance: 12 km                                 │     │
│     │  ⚖️ Weight: ~5 tons                                 │     │
│     │  💰 Payment: KES 5,000                              │     │
│     │                                                     │     │
│     │  Materials:                                         │     │
│     │  • 100 bags cement                                  │     │
│     │  • 50 pcs rebar                                     │     │
│     │  • 10 tons sand                                     │     │
│     │                                                     │     │
│     │  [Decline]              [Accept Delivery →]         │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  4. DELIVERY CONFIRMED                                          │
│     • Provider assigned to order                                │
│     • Supplier notified of pickup time                          │
│     • Builder notified of delivery schedule                     │
│     • Tracking activated                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Delivery Execution (Updated Process)

```
┌─────────────────────────────────────────────────────────────────┐
│                   DELIVERY EXECUTION                             │
│          (2-Point Scanning - No Transit Scanning)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: PICKUP & DISPATCH SCANNING (SUPPLIER)                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  1. Driver arrives at supplier location                 │    │
│  │     • GPS confirms arrival                              │    │
│  │     • Status: "At Pickup Location"                      │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  2. SUPPLIER scans ALL QR codes during loading          │    │
│  │     ⚠️ Driver does NOT scan at pickup                   │    │
│  │     • Supplier staff scans each item                    │    │
│  │     • Quantity verified against order                   │    │
│  │     • Loading confirmed                                 │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  3. Loading complete                                    │    │
│  │     • All items scanned by supplier                     │    │
│  │     • Handover to driver confirmed                      │    │
│  │     • Dispatch timestamp recorded                       │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  4. Dispatch                                            │    │
│  │     • Status: "In Transit"                              │    │
│  │     • ETA calculated                                    │    │
│  │     • Builder notified                                  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  PHASE 2: TRANSIT (GPS TRACKING ONLY - NO SCANNING)             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ❌ NO SCANNING DURING TRANSIT                          │    │
│  │                                                         │    │
│  │  Driver focuses on:                                     │    │
│  │  • Safe transportation                                  │    │
│  │  • Route navigation                                     │    │
│  │  • Material protection                                  │    │
│  │                                                         │    │
│  │  REAL-TIME TRACKING:                                    │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │                                                   │ │    │
│  │  │    📍 Current Location                            │ │    │
│  │  │    ┌─────────────────────────────────────────┐   │ │    │
│  │  │    │         🗺️ MAP                          │   │ │    │
│  │  │    │                                         │   │ │    │
│  │  │    │    [Pickup] ═══🚚═══○═══○═══ [Site]    │   │ │    │
│  │  │    │                                         │   │ │    │
│  │  │    └─────────────────────────────────────────┘   │ │    │
│  │  │                                                   │ │    │
│  │  │    🚚 Vehicle: KCB 123A                           │ │    │
│  │  │    👤 Driver: James Ochieng                       │ │    │
│  │  │    📞 Contact: +254 733 444 555                   │ │    │
│  │  │                                                   │ │    │
│  │  │    ⏱️ ETA: 45 minutes                             │ │    │
│  │  │    📏 Distance remaining: 8 km                    │ │    │
│  │  │                                                   │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  PHASE 3: DELIVERY & SCANNING (DRIVER - MANDATORY)              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  1. Driver arrives at site                              │    │
│  │     • GPS confirms arrival                              │    │
│  │     • Status: "At Delivery Location"                    │    │
│  │     • Builder notified                                  │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  2. Driver offloads ALL materials                       │    │
│  │     • Materials placed at designated area               │    │
│  │     • Builder/site manager present                      │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  3. DRIVER scans ALL items (MANDATORY)                  │    │
│  │     ⚠️ Must scan AFTER offloading                       │    │
│  │     • Scan each QR code                                 │    │
│  │     • Verify all items delivered                        │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  4. DRIVER reports damages (if any)                     │    │
│  │     • Mark damaged items                                │    │
│  │     • Describe damage                                   │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  5. DRIVER uploads photos (MANDATORY)                   │    │
│  │     📸 REQUIRED:                                        │    │
│  │     • Photos of ALL delivered items                     │    │
│  │     • Overview photo of entire delivery                 │    │
│  │     📸 IF DAMAGED:                                      │    │
│  │     • Close-up photos of each damaged item              │    │
│  │     • Both items AND damages need photo evidence        │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  6. GRN auto-generated                                  │    │
│  │     • Includes all scan data                            │    │
│  │     • Includes all photos                               │    │
│  │     • Includes damage reports                           │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  7. Delivery complete                                   │    │
│  │     • Status: "Delivered"                               │    │
│  │     • All parties notified                              │    │
│  │     • Payment released to provider                      │    │
│  │     • Damage claim initiated (if applicable)            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Goods Received Note (GRN)

```
┌─────────────────────────────────────────────────────────────────┐
│                   GOODS RECEIVED NOTE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🏗️ UjenziXform                                           │    │
│  │  GOODS RECEIVED NOTE                                    │    │
│  │                                                         │    │
│  │  GRN Number: GRN-2025-001234                            │    │
│  │  PO Reference: PO-2025-001234                           │    │
│  │  Date: December 5, 2025                                 │    │
│  │  Time: 11:23 AM                                         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  RECEIVED BY:                                           │    │
│  │  Name: Peter Mwangi                                     │    │
│  │  Role: Site Manager                                     │    │
│  │  Phone: +254 711 222 333                                │    │
│  │                                                         │    │
│  │  DELIVERED BY:                                          │    │
│  │  Driver: James Ochieng                                  │    │
│  │  Vehicle: KCB 123A                                      │    │
│  │  Provider: FastTrack Deliveries                         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  ITEMS RECEIVED:                                        │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Item          │ Ordered │ Received │ Status      │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ Bamburi Cement│   100   │   100    │ ✓ Complete  │ │    │
│  │  │ Y12 Rebar     │    50   │    50    │ ✓ Complete  │ │    │
│  │  │ River Sand    │    10   │    10    │ ✓ Complete  │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  CONDITION NOTES:                                       │    │
│  │  □ All items in good condition                          │    │
│  │  □ Minor damage noted (see photos)                      │    │
│  │  □ Shortage reported                                    │    │
│  │                                                         │    │
│  │  Comments: All materials received in good condition.    │    │
│  │  Cement bags intact, rebar properly bundled.            │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  SIGNATURES:                                            │    │
│  │                                                         │    │
│  │  Received By:          Delivered By:                    │    │
│  │  [Digital Signature]   [Digital Signature]              │    │
│  │  Peter Mwangi          James Ochieng                    │    │
│  │  11:23 AM              11:23 AM                         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  [Download PDF]  [Email Copy]  [Report Issue]           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Issue Resolution

### 4.1 Delivery Issues

```
┌─────────────────────────────────────────────────────────────────┐
│                   ISSUE TYPES & RESOLUTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ISSUE: DAMAGED GOODS                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Builder reports damage during receiving              │    │
│  │ 2. Photos uploaded as evidence                          │    │
│  │ 3. Supplier notified immediately                        │    │
│  │ 4. Options:                                             │    │
│  │    a) Accept with discount                              │    │
│  │    b) Reject damaged items                              │    │
│  │    c) Request replacement                               │    │
│  │ 5. Resolution logged in system                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ISSUE: SHORTAGE                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Builder reports quantity mismatch                    │    │
│  │ 2. QR scan records compared                             │    │
│  │ 3. Investigation initiated                              │    │
│  │ 4. Options:                                             │    │
│  │    a) Supplier sends remaining items                    │    │
│  │    b) Refund for missing items                          │    │
│  │    c) Credit for future order                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ISSUE: WRONG ITEMS                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Builder identifies wrong products                    │    │
│  │ 2. Return pickup scheduled                              │    │
│  │ 3. Correct items dispatched                             │    │
│  │ 4. Supplier bears additional delivery cost              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ISSUE: DELIVERY DELAY                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. System detects delay (ETA exceeded)                  │    │
│  │ 2. Builder notified with updated ETA                    │    │
│  │ 3. If significant delay:                                │    │
│  │    a) Compensation offered                              │    │
│  │    b) Alternative provider option                       │    │
│  │ 4. Provider rating affected                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ISSUE: PROVIDER CANCELLATION                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Provider cancels delivery                            │    │
│  │ 2. DeliveryReassignmentService activated                │    │
│  │ 3. Alternative providers alerted                        │    │
│  │ 4. Bonus incentive offered for quick pickup             │    │
│  │ 5. Builder kept informed throughout                     │    │
│  │ 6. Original provider penalized                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Order Tracking

### 5.1 Tracking Page Flow

**Route:** `/tracking` or `/tracking/:orderId`  
**File:** `src/pages/Tracking.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORDER TRACKING PAGE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🔍 Track Your Order                                    │    │
│  │                                                         │    │
│  │  Enter Order/PO Number:                                 │    │
│  │  [PO-2025-001234                    ] [Track →]         │    │
│  │                                                         │    │
│  │  Or scan QR code: [📷 Scan]                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ORDER STATUS: IN TRANSIT 🚚                            │    │
│  │                                                         │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │                                                   │ │    │
│  │  │  ✓ Order Placed ─────────────────────── Dec 3     │ │    │
│  │  │  │                                                │ │    │
│  │  │  ✓ Payment Confirmed ────────────────── Dec 3     │ │    │
│  │  │  │                                                │ │    │
│  │  │  ✓ Order Processing ─────────────────── Dec 4     │ │    │
│  │  │  │                                                │ │    │
│  │  │  ✓ Ready for Dispatch ───────────────── Dec 5     │ │    │
│  │  │  │                                                │ │    │
│  │  │  ✓ Picked Up ────────────────────────── Dec 5     │ │    │
│  │  │  │                                                │ │    │
│  │  │  ● In Transit ───────────────────────── Now       │ │    │
│  │  │  │                                                │ │    │
│  │  │  ○ Delivered ────────────────────────── Pending   │ │    │
│  │  │                                                   │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  LIVE LOCATION:                                         │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │                  🗺️ MAP                           │ │    │
│  │  │                                                   │ │    │
│  │  │     [Supplier] ════🚚════════○═══ [Your Site]    │ │    │
│  │  │                                                   │ │    │
│  │  │     ETA: 25 minutes                               │ │    │
│  │  │                                                   │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  DRIVER DETAILS:                                        │    │
│  │  👤 James Ochieng                                       │    │
│  │  🚚 KCB 123A (Lorry)                                    │    │
│  │  📞 [Call Driver]  💬 [Message]                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Notifications Throughout Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION TRIGGERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EVENT                    │ BUILDER │ SUPPLIER │ DRIVER         │
│  ─────────────────────────┼─────────┼──────────┼────────        │
│  Quote Requested          │    -    │   ✓ 📧📱  │    -           │
│  Quote Received           │  ✓ 📧📱 │    -     │    -           │
│  Order Confirmed          │  ✓ 📧📱 │   ✓ 📧📱  │    -           │
│  Payment Received         │  ✓ 📧   │   ✓ 📧   │    -           │
│  Ready for Dispatch       │  ✓ 📱   │    -     │   ✓ 📱         │
│  Delivery Assigned        │  ✓ 📱   │   ✓ 📱   │   ✓ 📧📱       │
│  Pickup Complete          │  ✓ 📱   │   ✓ 📱   │    -           │
│  In Transit               │  ✓ 📱   │    -     │    -           │
│  Arriving Soon (5 min)    │  ✓ 📱   │    -     │    -           │
│  Delivered                │  ✓ 📧📱 │   ✓ 📧📱  │   ✓ 📱         │
│  Issue Reported           │  ✓ 📧📱 │   ✓ 📧📱  │   ✓ 📱         │
│  Review Requested         │  ✓ 📧   │    -     │    -           │
│                                                                 │
│  📧 = Email   📱 = Push/SMS                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 2.0*  
*Last Updated: December 3, 2025*

