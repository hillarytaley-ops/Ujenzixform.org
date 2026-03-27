# 🏪 UjenziXform Suppliers Workflow Documentation

## Overview

This document covers both the **Supplier Marketplace** (where builders browse and buy materials) and the **Supplier Dashboard** (where suppliers manage their business).

---

## Table of Contents

1. [Supplier Marketplace (For Buyers)](#1-supplier-marketplace-for-buyers)
2. [Supplier Dashboard (For Suppliers)](#2-supplier-dashboard-for-suppliers)
3. [Product Management](#3-product-management)
4. [Order Processing](#4-order-processing)
5. [Quote Management](#5-quote-management)
6. [Inventory Management](#6-inventory-management)
7. [Analytics & Reports](#7-analytics--reports)
8. [Component Reference](#8-component-reference)

---

## 1. Supplier Marketplace (For Buyers)

### 1.1 Marketplace Overview

**Routes:** `/suppliers` or `/supplier-marketplace`  
**Files:** `src/pages/SuppliersMobileOptimized.tsx`, `src/pages/SupplierMarketplace.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUPPLIER MARKETPLACE                           │
│              (Where Builders Find Materials)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PURPOSE:                                                       │
│  • Browse verified construction material suppliers              │
│  • Search products by category, location, price                 │
│  • Request quotes from multiple suppliers                       │
│  • Compare prices and ratings                                   │
│  • Place orders directly                                        │
│                                                                 │
│  TARGET USERS:                                                  │
│  • Professional Builders                                        │
│  • Private Clients (Homeowners)                                 │
│  • Construction Companies                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Marketplace Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                   MARKETPLACE PAGE LAYOUT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      NAVIGATION                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      HERO SECTION                        │    │
│  │                                                         │    │
│  │  🇰🇪 Trusted by 500+ Kenyan Suppliers                   │    │
│  │                                                         │    │
│  │  "Kenyan Suppliers Powered by UjenziXform"                 │    │
│  │                                                         │    │
│  │  [Browse Materials]  [Become a Supplier]                │    │
│  │                                                         │    │
│  │  Stats: 500+ Suppliers | 47 Counties | 10K+ Products    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SEARCH & FILTERS                       │    │
│  │                                                         │    │
│  │  [🔍 Search materials...                              ] │    │
│  │                                                         │    │
│  │  Category: [All ▼]  County: [All ▼]  Price: [Any ▼]    │    │
│  │  Rating: [★★★★★]   In Stock: [✓]   Verified: [✓]       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   CATEGORY TABS                          │    │
│  │                                                         │    │
│  │  [All] [Cement] [Steel] [Timber] [Roofing] [Plumbing]  │    │
│  │  [Electrical] [Tiles] [Paint] [Hardware] [More ▼]       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   MATERIALS GRID                         │    │
│  │                                                         │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │
│  │  │ 📦 Cement    │ │ 📦 Steel     │ │ 📦 Timber    │    │    │
│  │  │              │ │              │ │              │    │    │
│  │  │ [Image]      │ │ [Image]      │ │ [Image]      │    │    │
│  │  │              │ │              │ │              │    │    │
│  │  │ Bamburi 50kg │ │ Y12 Rebar    │ │ Cypress 2x4  │    │    │
│  │  │ KES 850/bag  │ │ KES 1,200/pc │ │ KES 450/pc   │    │    │
│  │  │ ★★★★☆ (45)   │ │ ★★★★★ (128)  │ │ ★★★☆☆ (23)   │    │    │
│  │  │ ABC Hardware │ │ Steel Masters│ │ Timber World │    │    │
│  │  │ Nairobi      │ │ Mombasa      │ │ Eldoret      │    │    │
│  │  │              │ │              │ │              │    │    │
│  │  │[View][Quote] │ │[View][Quote] │ │[View][Quote] │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │    │
│  │                                                         │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │
│  │  │ 📦 Roofing   │ │ 📦 Paint     │ │ 📦 Tiles     │    │    │
│  │  │ ...          │ │ ...          │ │ ...          │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │    │
│  │                                                         │    │
│  │  [Load More Products...]                                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      FOOTER                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Material Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                   MATERIAL CATEGORIES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STRUCTURAL MATERIALS:                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Cement & Concrete      • Steel & Iron                 │    │
│  │ • Bricks & Blocks        • Sand & Aggregates            │    │
│  │ • Timber & Wood          • Stone & Ballast              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ROOFING & EXTERIOR:                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Roofing Materials      • Iron Sheets                  │    │
│  │ • Gutters & Downpipes    • Waterproofing                │    │
│  │ • Insulation Materials                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  FINISHING MATERIALS:                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Tiles & Flooring       • Paint & Finishes             │    │
│  │ • Doors & Windows        • Glass & Aluminum             │    │
│  │ • Ceiling Materials                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  INSTALLATIONS:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Plumbing Supplies      • Electrical Supplies          │    │
│  │ • HVAC Materials         • Solar Equipment              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TOOLS & EQUIPMENT:                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Hardware & Tools       • Safety Equipment             │    │
│  │ • Construction Machinery                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Product Search Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCT SEARCH FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ENTER SEARCH QUERY                                          │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  🔍 [cement nairobi                              ]  │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  2. APPLY FILTERS (Optional)                                    │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Category: [Cement & Concrete ▼]                    │     │
│     │  County: [Nairobi ▼]                                │     │
│     │  Price Range: [KES 500 - 1,500]                     │     │
│     │  Rating: [★★★★☆ and above]                          │     │
│     │  ☑ In Stock Only                                    │     │
│     │  ☑ Verified Suppliers Only                          │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  3. VIEW RESULTS                                                │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Found 24 products from 8 suppliers                 │     │
│     │                                                     │     │
│     │  Sort by: [Price: Low to High ▼]                    │     │
│     │                                                     │     │
│     │  ┌────────────────────────────────────────────┐    │     │
│     │  │ Bamburi Cement 50kg                        │    │     │
│     │  │ ABC Hardware Ltd - Nairobi                 │    │     │
│     │  │ KES 820/bag | ★★★★★ (156 reviews)          │    │     │
│     │  │ ✓ In Stock | Delivery: 1-2 days            │    │     │
│     │  │ [View Details] [Request Quote] [Add to Cart]│    │     │
│     │  └────────────────────────────────────────────┘    │     │
│     │                                                     │     │
│     │  ┌────────────────────────────────────────────┐    │     │
│     │  │ Savanna Cement 50kg                        │    │     │
│     │  │ Mombasa Materials - Mombasa                │    │     │
│     │  │ KES 790/bag | ★★★★☆ (89 reviews)           │    │     │
│     │  │ ✓ In Stock | Delivery: 2-3 days            │    │     │
│     │  │ [View Details] [Request Quote] [Add to Cart]│    │     │
│     │  └────────────────────────────────────────────┘    │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  4. SELECT PRODUCT                                              │
│     Click "View Details" to see full product page               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Product Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCT DETAIL PAGE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ┌──────────────────┐  BAMBURI CEMENT 50KG              │    │
│  │  │                  │  ─────────────────────────────    │    │
│  │  │    [PRODUCT      │                                   │    │
│  │  │     IMAGE]       │  Price: KES 820 per bag           │    │
│  │  │                  │  Min Order: 10 bags               │    │
│  │  │                  │  Stock: 5,000 bags available      │    │
│  │  └──────────────────┘                                   │    │
│  │                        ★★★★★ 4.8 (156 reviews)          │    │
│  │  [Img1][Img2][Img3]                                     │    │
│  │                        ✓ Verified Supplier              │    │
│  │                        ✓ Quality Guaranteed             │    │
│  │                        ✓ Same-Day Dispatch              │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  QUANTITY:                                              │    │
│  │  [-] [100] [+] bags                                     │    │
│  │                                                         │    │
│  │  SUBTOTAL: KES 82,000                                   │    │
│  │                                                         │    │
│  │  [Add to Cart]  [Request Quote]  [Buy Now]              │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  DESCRIPTION:                                           │    │
│  │  Premium Portland cement suitable for all construction  │    │
│  │  applications. KEBS certified, 32.5N grade.             │    │
│  │                                                         │    │
│  │  SPECIFICATIONS:                                        │    │
│  │  • Weight: 50kg per bag                                 │    │
│  │  • Grade: 32.5N                                         │    │
│  │  • Certification: KEBS                                  │    │
│  │  • Shelf Life: 3 months                                 │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  SUPPLIER INFORMATION:                                  │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🏢 ABC Hardware Ltd                             │   │    │
│  │  │ 📍 Industrial Area, Nairobi                     │   │    │
│  │  │ ⭐ 4.8 rating (500+ orders)                      │   │    │
│  │  │ 🚚 Delivers to: Nairobi, Kiambu, Machakos       │   │    │
│  │  │ ⏱️ Response time: Usually within 2 hours        │   │    │
│  │  │                                                 │   │    │
│  │  │ [View Supplier Profile] [Contact Supplier]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  CUSTOMER REVIEWS:                                      │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ ★★★★★ "Excellent quality cement, fast delivery" │   │    │
│  │  │ - John M., Nairobi (Oct 2025)                   │   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ ★★★★☆ "Good product, slight delay in delivery"  │   │    │
│  │  │ - Mary W., Kiambu (Oct 2025)                    │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │  [View All 156 Reviews]                                 │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.6 Quote Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   QUOTE REQUEST FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CLICK "REQUEST QUOTE"                                       │
│     (On product card or detail page)                            │
│                          │                                      │
│                          ▼                                      │
│  2. QUOTE REQUEST MODAL OPENS                                   │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  📋 REQUEST QUOTE                                   │     │
│     │  ─────────────────────────────────────────────────  │     │
│     │                                                     │     │
│     │  Supplier: ABC Hardware Ltd                         │     │
│     │  Product: Bamburi Cement 50kg                       │     │
│     │                                                     │     │
│     │  ITEMS:                                             │     │
│     │  ┌─────────────────────────────────────────────┐   │     │
│     │  │ Product        │ Quantity │ Unit │ Est.     │   │     │
│     │  ├─────────────────────────────────────────────┤   │     │
│     │  │ Bamburi Cement │ [100   ] │ bags │ KES 82K  │   │     │
│     │  │ [+ Add Item]                                │   │     │
│     │  └─────────────────────────────────────────────┘   │     │
│     │                                                     │     │
│     │  DELIVERY DETAILS:                                  │     │
│     │  📍 Location: [Nairobi, Westlands          ▼]      │     │
│     │  📅 Needed by: [Dec 15, 2025            📅]        │     │
│     │                                                     │     │
│     │  ADDITIONAL NOTES:                                  │     │
│     │  ┌─────────────────────────────────────────────┐   │     │
│     │  │ Need delivery to construction site at Plot │   │     │
│     │  │ 123, Westlands. Gate opens 7AM-6PM.        │   │     │
│     │  └─────────────────────────────────────────────┘   │     │
│     │                                                     │     │
│     │  [Cancel]                    [Submit Quote Request] │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  3. QUOTE SUBMITTED                                             │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  ✅ Quote Request Submitted!                        │     │
│     │                                                     │     │
│     │  Reference: QR-2025-001234                          │     │
│     │  Supplier: ABC Hardware Ltd                         │     │
│     │  Expected Response: Within 24 hours                 │     │
│     │                                                     │     │
│     │  You'll receive a notification when the supplier    │     │
│     │  responds to your quote request.                    │     │
│     │                                                     │     │
│     │  [View My Quotes]  [Continue Shopping]              │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  4. SUPPLIER RECEIVES NOTIFICATION                              │
│     • Push notification                                         │
│     • Email alert                                               │
│     • SMS (optional)                                            │
│     • Visible in supplier dashboard                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Supplier Dashboard (For Suppliers)

### 2.1 Dashboard Overview

**Route:** Accessed after supplier login  
**File:** `src/components/suppliers/SupplierWorkflowDashboard.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUPPLIER DASHBOARD                             │
│              (Business Management Portal)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PURPOSE:                                                       │
│  • Manage products and inventory                                │
│  • Process incoming orders                                      │
│  • Respond to quote requests                                    │
│  • Generate QR codes for dispatch                               │
│  • Track deliveries                                             │
│  • View analytics and reports                                   │
│  • Manage business profile                                      │
│                                                                 │
│  TARGET USERS:                                                  │
│  • Registered and verified suppliers                            │
│  • Supplier staff with dashboard access                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUPPLIER DASHBOARD LAYOUT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      HEADER                              │    │
│  │  🏢 ABC Hardware Ltd          [Notifications 🔔3] [👤]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   TAB NAVIGATION                         │    │
│  │                                                         │    │
│  │  [Overview] [Orders] [Products] [Quotes] [Analytics]    │    │
│  │  [QR Codes] [Deliveries] [Reviews] [Settings]           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   QUICK STATS                            │    │
│  │                                                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ Orders  │ │ Revenue │ │ Rating  │ │On-Time  │       │    │
│  │  │ 156     │ │ 2.45M   │ │ ★ 4.7   │ │ 94%     │       │    │
│  │  │ Total   │ │ KES     │ │ Avg     │ │Delivery │       │    │
│  │  │         │ │         │ │         │ │         │       │    │
│  │  │ 12 New  │ │ +15%    │ │ 500+    │ │ ↑ 3%    │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   MAIN CONTENT AREA                      │    │
│  │                                                         │    │
│  │  (Content changes based on selected tab)                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Dashboard Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│                   DASHBOARD TABS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TAB 1: OVERVIEW                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Quick stats summary                                   │    │
│  │ • Recent orders (last 5)                                │    │
│  │ • Pending actions (quotes, orders to process)           │    │
│  │ • Revenue chart (last 30 days)                          │    │
│  │ • Low stock alerts                                      │    │
│  │ • Recent reviews                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 2: ORDERS                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • All orders list with filters                          │    │
│  │ • Order status management                               │    │
│  │ • Order details view                                    │    │
│  │ • Generate invoices                                     │    │
│  │ • Schedule deliveries                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 3: PRODUCTS                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Product catalog management                            │    │
│  │ • Add/edit/delete products                              │    │
│  │ • Set prices and stock levels                           │    │
│  │ • Upload product images                                 │    │
│  │ • Category management                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 4: QUOTES                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Incoming quote requests                               │    │
│  │ • Respond to quotes                                     │    │
│  │ • Quote history                                         │    │
│  │ • Convert quotes to orders                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 5: ANALYTICS                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Sales reports                                         │    │
│  │ • Product performance                                   │    │
│  │ • Customer insights                                     │    │
│  │ • Revenue trends                                        │    │
│  │ • Export reports (PDF, Excel)                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 6: QR CODES                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Generate QR codes for orders                          │    │
│  │ • Download/print QR labels                              │    │
│  │ • Track QR scan history                                 │    │
│  │ • Dispatch scanning                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 7: DELIVERIES                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Active deliveries tracking                            │    │
│  │ • Delivery history                                      │    │
│  │ • Delivery provider assignment                          │    │
│  │ • Delivery issues/disputes                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 8: REVIEWS                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Customer reviews list                                 │    │
│  │ • Respond to reviews                                    │    │
│  │ • Rating statistics                                     │    │
│  │ • Feedback trends                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TAB 9: SETTINGS                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Business profile                                      │    │
│  │ • Delivery areas                                        │    │
│  │ • Payment settings                                      │    │
│  │ • Notification preferences                              │    │
│  │ • Staff access management                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Product Management

### 3.1 Add New Product

**File:** `src/components/suppliers/SupplierProductManager.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                   ADD NEW PRODUCT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📦 ADD NEW PRODUCT                                     │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  BASIC INFORMATION:                                     │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Product Name *                                  │   │    │
│  │  │ [Bamburi Portland Cement 50kg               ]   │   │    │
│  │  │                                                 │   │    │
│  │  │ Category *                                      │   │    │
│  │  │ [Cement                                    ▼]   │   │    │
│  │  │                                                 │   │    │
│  │  │ Description                                     │   │    │
│  │  │ ┌─────────────────────────────────────────────┐│   │    │
│  │  │ │ Premium Portland cement suitable for all   ││   │    │
│  │  │ │ construction applications. KEBS certified. ││   │    │
│  │  │ └─────────────────────────────────────────────┘│   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  PRICING & INVENTORY:                                   │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Unit *           │ Unit Price (KES) *           │   │    │
│  │  │ [bag         ▼]  │ [850                     ]   │   │    │
│  │  │                                                 │   │    │
│  │  │ Stock Quantity   │ Minimum Order               │   │    │
│  │  │ [5000         ]  │ [10                      ]   │   │    │
│  │  │                                                 │   │    │
│  │  │ ☑ In Stock                                      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  PRODUCT IMAGE:                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │  ┌──────────────┐                               │   │    │
│  │  │  │              │  [Upload Image]               │   │    │
│  │  │  │  [Preview]   │  [Use Category Default]       │   │    │
│  │  │  │              │                               │   │    │
│  │  │  └──────────────┘  Recommended: 800x600px       │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  SPECIFICATIONS (Optional):                             │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ [+ Add Specification]                           │   │    │
│  │  │                                                 │   │    │
│  │  │ Weight: [50kg        ]                          │   │    │
│  │  │ Grade:  [32.5N       ]                          │   │    │
│  │  │ Brand:  [Bamburi     ]                          │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  [Cancel]                              [Save Product]   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Product List View

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCT LIST                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Add Product]  [Import CSV]  [Export]                        │
│                                                                 │
│  🔍 Search products...   Category: [All ▼]   Stock: [All ▼]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Product           │ Category │ Price   │ Stock  │ Actions│   │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ 📦 Bamburi Cement │ Cement   │ KES 850 │ 5,000  │ [✏️][🗑️]│   │
│  │ 📦 Y12 Rebar 12m  │ Steel    │ KES 1,200│ 500   │ [✏️][🗑️]│   │
│  │ 📦 River Sand     │ Aggregates│ KES 2,400│ 100 tons│[✏️][🗑️]│   │
│  │ 📦 Iron Sheets    │ Roofing  │ KES 950 │ 2,000  │ [✏️][🗑️]│   │
│  │ 📦 Crown Paint 20L│ Paint    │ KES 4,500│ 150   │ [✏️][🗑️]│   │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Showing 1-5 of 45 products    [< Prev] [1] [2] [3] [Next >]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Order Processing

### 4.1 Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORDER LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ PENDING │───▶│CONFIRMED│───▶│PROCESSING│───▶│ READY   │     │
│  │         │    │         │    │         │    │FOR SHIP │      │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘      │
│       │                                            │            │
│       │ Rejected                                   │            │
│       ▼                                            ▼            │
│  ┌─────────┐                                  ┌─────────┐       │
│  │CANCELLED│                                  │ SHIPPED │       │
│  │         │                                  │         │       │
│  └─────────┘                                  └────┬────┘       │
│                                                    │            │
│                                                    ▼            │
│                                               ┌─────────┐       │
│                                               │DELIVERED│       │
│                                               │         │       │
│                                               └────┬────┘       │
│                                                    │            │
│                                                    ▼            │
│                                               ┌─────────┐       │
│                                               │COMPLETED│       │
│                                               │         │       │
│                                               └─────────┘       │
│                                                                 │
│  STATUS DESCRIPTIONS:                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PENDING    - New order, awaiting supplier confirmation  │    │
│  │ CONFIRMED  - Supplier accepted, payment verified         │    │
│  │ PROCESSING - Materials being prepared                   │    │
│  │ READY      - Ready for dispatch, QR codes generated     │    │
│  │ SHIPPED    - Handed to delivery provider                │    │
│  │ DELIVERED  - Arrived at destination                     │    │
│  │ COMPLETED  - GRN signed, payment released               │    │
│  │ CANCELLED  - Order cancelled by either party            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Order Processing Flow (Supplier Side)

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORDER PROCESSING FLOW                          │
│                    (Supplier Actions)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. NEW ORDER NOTIFICATION                                      │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  🔔 New Order Received!                             │     │
│     │  Order: PO-2025-001234                              │     │
│     │  Customer: John Kamau Construction                  │     │
│     │  Amount: KES 195,460                                │     │
│     │  [View Order]                                       │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  2. REVIEW ORDER DETAILS                                        │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  ORDER: PO-2025-001234                              │     │
│     │  Status: PENDING                                    │     │
│     │                                                     │     │
│     │  CUSTOMER:                                          │     │
│     │  John Kamau Construction                            │     │
│     │  📞 +254 712 345 678                                │     │
│     │  📍 Westlands, Nairobi                              │     │
│     │                                                     │     │
│     │  ITEMS:                                             │     │
│     │  ┌─────────────────────────────────────────────┐   │     │
│     │  │ Bamburi Cement 50kg  x 100  @ 820  = 82,000 │   │     │
│     │  │ Y12 Rebar 12m        x 50   @ 1,150= 57,500 │   │     │
│     │  │ River Sand           x 10t  @ 2,400= 24,000 │   │     │
│     │  ├─────────────────────────────────────────────┤   │     │
│     │  │ Subtotal                         KES 163,500│   │     │
│     │  │ Delivery                         KES 5,000  │   │     │
│     │  │ VAT (16%)                        KES 26,960 │   │     │
│     │  │ TOTAL                            KES 195,460│   │     │
│     │  └─────────────────────────────────────────────┘   │     │
│     │                                                     │     │
│     │  DELIVERY:                                          │     │
│     │  📅 Requested: Dec 15, 2025                         │     │
│     │  📍 Site: Greenfield Apartments, Westlands          │     │
│     │                                                     │     │
│     │  [Reject Order]  [Accept Order →]                   │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  3. ACCEPT ORDER                                                │
│     • Order status changes to CONFIRMED                         │
│     • Customer notified                                         │
│     • Payment verified                                          │
│                          │                                      │
│                          ▼                                      │
│  4. PROCESS ORDER                                               │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  📦 PROCESSING ORDER                                │     │
│     │                                                     │     │
│     │  Checklist:                                         │     │
│     │  ☑ Verify stock availability                        │     │
│     │  ☑ Reserve materials                                │     │
│     │  ☐ Prepare materials for dispatch                   │     │
│     │  ☐ Generate QR codes                                │     │
│     │  ☐ Print and attach QR labels                       │     │
│     │  ☐ Schedule delivery                                │     │
│     │                                                     │     │
│     │  [Mark as Ready for Dispatch →]                     │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  5. GENERATE QR CODES                                           │
│     (See QR Code Workflow documentation)                        │
│     • Download QR codes                                         │
│     • Print labels                                              │
│     • Attach to matching items                                  │
│                          │                                      │
│                          ▼                                      │
│  6. DISPATCH SCANNING                                           │
│     • Scan all items during loading                             │
│     • Verify quantities                                         │
│     • Hand over to delivery provider                            │
│                          │                                      │
│                          ▼                                      │
│  7. TRACK DELIVERY                                              │
│     • Monitor delivery progress                                 │
│     • Receive delivery confirmation                             │
│     • View GRN and photos                                       │
│                          │                                      │
│                          ▼                                      │
│  8. ORDER COMPLETED                                             │
│     • Payment released                                          │
│     • Order marked as completed                                 │
│     • Request customer review                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Order List View

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORDERS LIST                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [All ▼]  Status: [All ▼]  Date: [Last 30 days ▼]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ⚠️ PENDING ORDERS (3)                                  │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🔴 PO-2025-001234                               │   │    │
│  │  │ John Kamau Construction | KES 195,460           │   │    │
│  │  │ 📅 Dec 15, 2025 | ⚡ HIGH PRIORITY               │   │    │
│  │  │ [View] [Accept] [Reject]                        │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🟡 PO-2025-001235                               │   │    │
│  │  │ Nairobi Builders Co | KES 89,000                │   │    │
│  │  │ 📅 Dec 12, 2025 | ⚡ MEDIUM PRIORITY             │   │    │
│  │  │ [View] [Accept] [Reject]                        │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  📦 PROCESSING ORDERS (5)                               │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🔵 PO-2025-001230                               │   │    │
│  │  │ Coastal Construction | KES 67,000               │   │    │
│  │  │ 📅 Dec 10, 2025 | Status: Ready for Dispatch    │   │    │
│  │  │ [View] [Generate QR] [Dispatch]                 │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Quote Management

### 5.1 Incoming Quote Requests

```
┌─────────────────────────────────────────────────────────────────┐
│                   QUOTE REQUESTS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 PENDING QUOTE REQUESTS (5)                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  QR-2025-001234                           ⏰ 2 hours ago│    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  From: Peter Mwangi (Mwangi Contractors)                │    │
│  │  📞 +254 722 123 456                                    │    │
│  │                                                         │    │
│  │  REQUESTED ITEMS:                                       │    │
│  │  • Bamburi Cement 50kg - 200 bags                       │    │
│  │  • Y12 Rebar 12m - 100 pieces                           │    │
│  │  • River Sand - 20 tonnes                               │    │
│  │                                                         │    │
│  │  DELIVERY:                                              │    │
│  │  📍 Kilimani, Nairobi                                   │    │
│  │  📅 Needed by: Dec 20, 2025                             │    │
│  │                                                         │    │
│  │  NOTE: "Large project, need competitive pricing.        │    │
│  │         Will order monthly if prices are good."         │    │
│  │                                                         │    │
│  │  [Decline]  [Respond with Quote →]                      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Respond to Quote

```
┌─────────────────────────────────────────────────────────────────┐
│                   RESPOND TO QUOTE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📋 QUOTE RESPONSE                                      │    │
│  │  Reference: QR-2025-001234                              │    │
│  │  Customer: Peter Mwangi (Mwangi Contractors)            │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  PRICING:                                               │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Item              │ Qty │ Unit Price │ Total    │   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ Bamburi Cement    │ 200 │ [800    ]  │ 160,000  │   │    │
│  │  │ Y12 Rebar 12m     │ 100 │ [1,100  ]  │ 110,000  │   │    │
│  │  │ River Sand        │ 20t │ [2,200  ]  │ 44,000   │   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ Subtotal                             │ 314,000  │   │    │
│  │  │ Delivery Fee                         │ [8,000 ] │   │    │
│  │  │ Discount (5%)                        │ -15,700  │   │    │
│  │  │ VAT (16%)                            │ 49,008   │   │    │
│  │  │ TOTAL                                │ 355,308  │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  DELIVERY:                                              │    │
│  │  📅 Proposed Date: [Dec 18, 2025        📅]            │    │
│  │  ⏰ Time: [Morning (8AM-12PM)           ▼]             │    │
│  │                                                         │    │
│  │  TERMS & CONDITIONS:                                    │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ • Quote valid for 7 days                        │   │    │
│  │  │ • 50% advance payment required                  │   │    │
│  │  │ • Prices subject to stock availability          │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  MESSAGE TO CUSTOMER:                                   │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Thank you for your inquiry. We've applied a 5%  │   │    │
│  │  │ bulk discount. For regular monthly orders, we   │   │    │
│  │  │ can offer better rates. Contact us to discuss.  │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  [Cancel]                           [Send Quote →]      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Inventory Management

### 6.1 Stock Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVENTORY OVERVIEW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📊 STOCK SUMMARY                                       │    │
│  │                                                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ Total   │ │ Low     │ │ Out of  │ │ Value   │       │    │
│  │  │Products │ │ Stock   │ │ Stock   │ │         │       │    │
│  │  │   45    │ │   8     │ │   2     │ │ 4.5M    │       │    │
│  │  │         │ │ ⚠️      │ │ 🔴      │ │ KES     │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⚠️ LOW STOCK ALERTS:                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🟡 Bamburi Cement 50kg                          │   │    │
│  │  │ Current: 50 bags | Reorder Level: 100 bags      │   │    │
│  │  │ [Restock]                                       │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🔴 Y16 Rebar 12m                                │   │    │
│  │  │ Current: 0 pieces | OUT OF STOCK                │   │    │
│  │  │ [Mark as Back-ordered] [Restock]                │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Stock Update

```
┌─────────────────────────────────────────────────────────────────┐
│                   UPDATE STOCK                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📦 UPDATE STOCK: Bamburi Cement 50kg                   │    │
│  │                                                         │    │
│  │  Current Stock: 50 bags                                 │    │
│  │                                                         │    │
│  │  Action:                                                │    │
│  │  ○ Add Stock                                            │    │
│  │  ○ Remove Stock                                         │    │
│  │  ● Set Stock Level                                      │    │
│  │                                                         │    │
│  │  New Quantity: [500        ] bags                       │    │
│  │                                                         │    │
│  │  Reason:                                                │    │
│  │  [New shipment received from manufacturer   ▼]          │    │
│  │                                                         │    │
│  │  Notes:                                                 │    │
│  │  [Batch #2025-1203, expires March 2026       ]          │    │
│  │                                                         │    │
│  │  [Cancel]                         [Update Stock]        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Analytics & Reports

### 7.1 Sales Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                   ANALYTICS DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Period: [Last 30 Days ▼]  Compare: [Previous Period ▼]        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📊 REVENUE OVERVIEW                                    │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │                                                 │   │    │
│  │  │  Total Revenue: KES 2,450,000                   │   │    │
│  │  │  ↑ 15% vs previous period                       │   │    │
│  │  │                                                 │   │    │
│  │  │  [Revenue Chart - Line Graph]                   │   │    │
│  │  │                                                 │   │    │
│  │  │  ─────────────────────────────────────────────  │   │    │
│  │  │  Week 1  Week 2  Week 3  Week 4                 │   │    │
│  │  │                                                 │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────┐ ┌──────────────────────┐              │
│  │ TOP PRODUCTS         │ │ TOP CUSTOMERS        │              │
│  │ ──────────────────── │ │ ──────────────────── │              │
│  │ 1. Bamburi Cement    │ │ 1. Mwangi Const.    │              │
│  │    KES 820,000       │ │    KES 450,000      │              │
│  │ 2. Y12 Rebar         │ │ 2. Nairobi Builders │              │
│  │    KES 575,000       │ │    KES 380,000      │              │
│  │ 3. Iron Sheets       │ │ 3. Coastal Const.   │              │
│  │    KES 380,000       │ │    KES 290,000      │              │
│  └──────────────────────┘ └──────────────────────┘              │
│                                                                 │
│  [Export Report (PDF)]  [Export Data (Excel)]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Component Reference

### 8.1 Marketplace Components

| Component | File | Purpose |
|-----------|------|---------|
| `SuppliersMobileOptimized` | `src/pages/SuppliersMobileOptimized.tsx` | Main marketplace page |
| `SupplierMarketplace` | `src/pages/SupplierMarketplace.tsx` | Alternative marketplace |
| `MaterialsGrid` | `src/components/suppliers/MaterialsGrid.tsx` | Product grid display |
| `SupplierCard` | `src/components/suppliers/SupplierCard.tsx` | Supplier info card |
| `SupplierFilters` | `src/components/suppliers/SupplierFilters.tsx` | Search filters |
| `AdvancedFilters` | `src/components/suppliers/AdvancedFilters.tsx` | Advanced filtering |

### 8.2 Dashboard Components

| Component | File | Purpose |
|-----------|------|---------|
| `SupplierWorkflowDashboard` | `src/components/suppliers/SupplierWorkflowDashboard.tsx` | Main dashboard |
| `SupplierProductManager` | `src/components/suppliers/SupplierProductManager.tsx` | Product CRUD |
| `SupplierOrderTracker` | `src/components/suppliers/SupplierOrderTracker.tsx` | Order tracking |
| `SupplierPurchaseOrderManager` | `src/components/suppliers/SupplierPurchaseOrderManager.tsx` | PO management |
| `SupplierInvoiceViewer` | `src/components/suppliers/SupplierInvoiceViewer.tsx` | Invoice viewing |
| `GoodsReceivedNoteViewer` | `src/components/suppliers/GoodsReceivedNoteViewer.tsx` | GRN viewing |
| `SupplierRatingDisplay` | `src/components/suppliers/SupplierRatingDisplay.tsx` | Rating display |
| `SupplierReviewModal` | `src/components/suppliers/SupplierReviewModal.tsx` | Review modal |
| `SupplierApplicationManager` | `src/components/suppliers/SupplierApplicationManager.tsx` | New supplier apps |
| `RealTimeStats` | `src/components/suppliers/RealTimeStats.tsx` | Live statistics |

### 8.3 Related Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useSuppliers` | `src/hooks/useSuppliers.ts` | Supplier data fetching |
| `useSecureSuppliers` | `src/hooks/useSecureSuppliers.ts` | Secure supplier access |
| `useSupplierStats` | `src/hooks/useSupplierStats.ts` | Supplier statistics |
| `useSupplierReviews` | `src/hooks/useSupplierReviews.ts` | Review management |
| `useSupplierCapabilities` | `src/hooks/useSupplierCapabilities.ts` | Supplier capabilities |

---

*Document Version: 2.0*  
*Last Updated: December 4, 2025*








