# MradiPro Scanner Page Workflow
## QR Code & Barcode Scanning System

---

## 🎯 Overview

The MradiPro Scanner is a powerful tool for quick data entry, verification, and tracking across the platform. It enables users to scan QR codes and barcodes for orders, products, deliveries, and inventory management.

---

## 📱 Scanner Page Interface

```
┌────────────────────────────────────────────────────────────┐
│  ← MradiPro Scanner                          [Switch 📷]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│         ┌────────────────────────────────┐                │
│         │                                │                │
│         │                                │                │
│         │    📷 CAMERA VIEW              │                │
│         │                                │                │
│         │    ┌──────────────────┐        │                │
│         │    │                  │        │                │
│         │    │   SCAN AREA      │        │                │
│         │    │                  │        │                │
│         │    │   [QR Overlay]   │        │                │
│         │    │                  │        │                │
│         │    └──────────────────┘        │                │
│         │                                │                │
│         │                                │                │
│         │  Align QR code within frame    │                │
│         │                                │                │
│         └────────────────────────────────┘                │
│                                                            │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Quick Actions:                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   📦 Order   │  │  🏷️ Product  │  │  📋 Invoice  │   │
│  │     Scan     │  │     Scan     │  │     Scan     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  🚚 Delivery │  │  📊 Inventory│  │  💳 Payment  │   │
│  │     Scan     │  │     Scan     │  │     Scan     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Recent Scans:                                             │
│  • Order #PO-2024-156 - 2 mins ago                        │
│  • Product SKU-12345 - 5 mins ago                         │
│  • Delivery #DL-2024-089 - 10 mins ago                    │
│                                                            │
│  [View All] [Clear History]                               │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  💡 Tips:                                                  │
│  • Ensure good lighting                                    │
│  • Hold device steady                                      │
│  • Keep QR code within frame                               │
│  • Tap [📸] to switch camera                               │
│  • Tap [💡] to toggle flash                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Scanner Workflows

### 1️⃣ ORDER SCANNING WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│               ORDER QR CODE SCANNING                       │
└────────────────────────────────────────────────────────────┘

STEP 1: OPEN SCANNER
════════════════════
User opens scanner page
         │
         ▼
┌──────────────────────┐
│  Camera Permission   │
│  [Allow] [Deny]      │
└──────┬───────────────┘
       │
       ▼ [Allow]
Camera activates
Scanner ready


STEP 2: SCAN ORDER QR CODE
═══════════════════════════
Point camera at Order QR
         │
         ▼
┌──────────────────────────────┐
│   📷 SCANNING...             │
│   ┌────────────────┐         │
│   │   ▓▓▓▓▓▓▓▓    │         │
│   │   ▓▓    ▓▓    │         │
│   │   ▓▓▓▓▓▓▓▓    │         │
│   └────────────────┘         │
│   Detecting QR code...       │
└──────────┬───────────────────┘
           │
           ▼
QR Code Detected
         │
         ├─► Vibration feedback
         ├─► Beep sound
         └─► Visual confirmation
         │
         ▼
┌──────────────────────────────┐
│   ✅ SCAN SUCCESSFUL         │
│   Processing...              │
└──────────┬───────────────────┘
           │
           ▼


STEP 3: PARSE QR DATA
══════════════════════
Extract encoded data
         │
         ├─► Order ID: PO-2024-156
         ├─► Type: PURCHASE_ORDER
         ├─► Supplier ID
         └─► Client ID
         │
         ▼
Validate data format
         │
         ├─► [VALID] ──────────┐
         │                     │
         └─► [INVALID] ─────┐  │
                            │  │
                     Show Error │
                     Retry Scan │
                                │
                                ▼


STEP 4: FETCH ORDER DETAILS
════════════════════════════
Query database
         │
         ▼
SELECT * FROM purchase_orders
WHERE id = 'scanned_order_id'
         │
         ▼
┌──────────────────────────────────────┐
│   LOADING ORDER...                   │
│   [Spinner animation]                │
└──────────┬───────────────────────────┘
           │
           ▼


STEP 5: DISPLAY ORDER DETAILS
══════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  Order #PO-2024-156                                     │
│  Status: ● IN TRANSIT                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 Order Details                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Client: John Kamau Construction                        │
│  Supplier: Bamburi Cement Ltd                           │
│  Order Date: 18 Nov 2024                                │
│  Delivery Date: 20 Nov 2024                             │
│                                                         │
│  Items (3):                                             │
│  • Cement 50kg - 100 bags                              │
│  • Steel Bars 12mm - 200 pcs                           │
│  • Building Sand - 10 tonnes                            │
│                                                         │
│  Total: KES 295,800                                     │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Quick Actions:                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ View Full    │  │ Mark         │  │ Contact     │  │
│  │ Details      │  │ Delivered    │  │ Client      │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
│                                                         │
│  [Scan Another] [Share] [Print]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘


STEP 6: ACTION SELECTION
═════════════════════════
User selects action
         │
         ├─► [View Full Details] ──► Navigate to order page
         │
         ├─► [Mark Delivered] ────► Delivery confirmation flow
         │
         ├─► [Contact Client] ─────► Open chat/call
         │
         └─► [Scan Another] ───────► Return to scanner


STEP 7: UPDATE ORDER STATUS (if Mark Delivered)
════════════════════════════════════════════════
┌─────────────────────────────────────────────┐
│  Confirm Delivery                           │
├─────────────────────────────────────────────┤
│                                             │
│  All items delivered?                       │
│  ● Yes, all items ✓                        │
│  ○ No, partial delivery                    │
│                                             │
│  Condition:                                 │
│  ● Good condition ✓                        │
│  ○ Damaged items                           │
│                                             │
│  Notes: (optional)                          │
│  ┌───────────────────────────┐             │
│  │ All items received in     │             │
│  │ good condition            │             │
│  └───────────────────────────┘             │
│                                             │
│  Client Signature:                          │
│  ┌───────────────────────────┐             │
│  │  [Signature Pad]          │             │
│  │                           │             │
│  └───────────────────────────┘             │
│  [Clear] [Capture Photo]                   │
│                                             │
│  [Cancel] [Confirm Delivery]               │
│                                             │
└─────────────────────────────────────────────┘
         │
         ▼ [Confirm Delivery]
Update database
         │
         ├─► Update order status: DELIVERED
         ├─► Save signature
         ├─► Upload photos
         ├─► Record timestamp
         └─► Send notifications
         │
         ▼
┌─────────────────────────────────────────────┐
│  ✅ DELIVERY CONFIRMED                      │
│                                             │
│  Order #PO-2024-156 marked as delivered     │
│  Timestamp: 20 Nov 2024, 11:45 AM           │
│                                             │
│  • Email sent to client ✓                  │
│  • Supplier notified ✓                     │
│  • Invoice generated ✓                     │
│                                             │
│  [View Receipt] [Scan Another]             │
└─────────────────────────────────────────────┘
```

---

### 2️⃣ PRODUCT SCANNING WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│             PRODUCT BARCODE SCANNING                       │
└────────────────────────────────────────────────────────────┘

USE CASE 1: INVENTORY CHECK
═══════════════════════════

Warehouse Manager scans product
         │
         ▼
┌──────────────────────────────┐
│   📷 Scanning barcode...     │
│   ||||||||||||||||           │
│   Detecting...               │
└──────────┬───────────────────┘
           │
           ▼
Barcode detected: SKU-12345
         │
         ▼
Query product database
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Product Details                                        │
├─────────────────────────────────────────────────────────┤
│  ┌────────┐                                             │
│  │[Image] │  Bamburi Cement 50kg                        │
│  │        │  SKU: SKU-12345                             │
│  └────────┘  Category: Cement & Aggregates              │
│                                                          │
│  📊 Stock Information                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                          │
│  Current Stock: 450 bags                                │
│  ┌──────────────────────────────────────┐               │
│  │ ███████████████████░░░░░░░░░  75%   │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Minimum Level: 100 bags ✓                              │
│  Location: Warehouse A, Section 3                       │
│  Last Updated: 2 hours ago                              │
│                                                          │
│  📈 Recent Activity                                      │
│  • Sold: 50 bags (Today)                                │
│  • Received: 200 bags (Yesterday)                       │
│  • Reserved: 100 bags (2 orders)                        │
│                                                          │
│  💰 Pricing                                              │
│  Retail: KES 850                                         │
│  Wholesale: KES 800                                      │
│  Cost: KES 650                                           │
│                                                          │
│  Quick Actions:                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │ Add Stock    │  │ Create Order │  │ View Sales  │   │
│  └──────────────┘  └──────────────┘  └─────────────┘   │
│                                                          │
│  [Scan Another] [Edit Product] [Print Label]            │
│                                                          │
└─────────────────────────────────────────────────────────┘


USE CASE 2: QUICK PRICE CHECK
══════════════════════════════

Customer scans product in showroom
         │
         ▼
Barcode detected
         │
         ▼
┌─────────────────────────────────────────┐
│  💰 PRICE CHECK                         │
├─────────────────────────────────────────┤
│  ┌────────┐                             │
│  │[Image] │  Bamburi Cement 50kg        │
│  └────────┘                             │
│                                         │
│  Price: KES 850 per bag                 │
│                                         │
│  📦 Bulk Discounts:                     │
│  • 50+ bags:  KES 820 (-4%)            │
│  • 100+ bags: KES 800 (-6%)            │
│  • 500+ bags: KES 780 (-8%)            │
│                                         │
│  ✓ In Stock: 450 bags available        │
│  🚚 Free delivery on orders over 50kg   │
│                                         │
│  [Add to Cart] [Request Quote]         │
│                                         │
└─────────────────────────────────────────┘


USE CASE 3: ADD TO ORDER
════════════════════════

During order creation, scan products
         │
         ▼
┌─────────────────────────────────────────┐
│  Creating Order                         │
│  Cart: 2 items                          │
├─────────────────────────────────────────┤
│  Scanned: Bamburi Cement 50kg           │
│                                         │
│  Quantity:                              │
│  [  -  ]  [ 100 ]  [  +  ]             │
│                                         │
│  Unit Price: KES 800                    │
│  Subtotal: KES 80,000                   │
│                                         │
│  [Add to Cart] [Cancel]                │
└─────────────────────────────────────────┘
         │
         ▼ [Add to Cart]
Item added successfully
         │
         ▼
Cart updated: 3 items
Total: KES 245,000
         │
         ▼
[Continue Scanning] [Proceed to Checkout]
```

---

### 3️⃣ DELIVERY SCANNING WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│            DELIVERY QR CODE SCANNING                       │
└────────────────────────────────────────────────────────────┘

SCENARIO: Driver arrives at delivery location
═════════════════════════════════════════════

STEP 1: SCAN DELIVERY NOTE
═══════════════════════════
Driver opens scanner
         │
         ▼
Scan Delivery Note QR Code
         │
         ▼
┌──────────────────────────────┐
│   📷 SCANNING...             │
│   Delivery Note detected     │
└──────────┬───────────────────┘
           │
           ▼
QR Code: DN-2024-089
         │
         ▼


STEP 2: LOAD DELIVERY INFO
═══════════════════════════
┌─────────────────────────────────────────────────────────┐
│  Delivery #DN-2024-089                                  │
│  Order: PO-2024-156                                     │
│  Status: ● ARRIVED AT LOCATION                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📍 Delivery Address                                    │
│  Kilimani, Plot 123, Nairobi                           │
│  GPS: -1.2921, 36.8219                                 │
│  [Open in Maps]                                         │
│                                                         │
│  👤 Contact Person                                      │
│  Jane Wanjiku                                           │
│  📞 0712 345 678                                        │
│  [Call] [Message]                                       │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  📦 Items to Deliver (3)                                │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ ☐ Bamburi Cement 50kg                         │     │
│  │   Quantity: 100 bags                          │     │
│  │   [Scan Item] [Mark Delivered]                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ ☐ Steel Bars 12mm                             │     │
│  │   Quantity: 200 pieces                        │     │
│  │   [Scan Item] [Mark Delivered]                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ ☐ Building Sand                               │     │
│  │   Quantity: 10 tonnes                         │     │
│  │   [Scan Item] [Mark Delivered]                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  Progress: 0/3 items verified                           │
│  ┌─────────────────────────────────────┐               │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%    │               │
│  └─────────────────────────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘


STEP 3: VERIFY ITEMS (Scan each item)
══════════════════════════════════════
Driver scans first item barcode
         │
         ▼
┌──────────────────────────────┐
│   📷 Scanning item...        │
│   ||||||||||||||||           │
└──────────┬───────────────────┘
           │
           ▼
Item matched: Cement 50kg
         │
         ▼
┌─────────────────────────────────────────┐
│  ✅ ITEM VERIFIED                       │
│  Bamburi Cement 50kg                    │
│                                         │
│  Expected: 100 bags                     │
│  Delivered: [ 100 ] bags                │
│                                         │
│  Condition:                             │
│  ● Good ✓                              │
│  ○ Damaged                             │
│  ○ Missing items                       │
│                                         │
│  Photo: [Take Photo]                    │
│  ┌──────────────┐                      │
│  │ [📷 Capture] │                      │
│  └──────────────┘                      │
│                                         │
│  [Confirm] [Report Issue]              │
└─────────────────────────────────────────┘
         │
         ▼ [Confirm]
Item 1/3 verified ✓
         │
         ▼
Continue scanning remaining items...
         │
         ▼
All items verified (3/3)
         │
         ▼


STEP 4: CAPTURE CLIENT SIGNATURE
═════════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  Delivery Confirmation                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  All Items Verified: ✓                                  │
│  • Cement 50kg - 100 bags ✓                            │
│  • Steel Bars 12mm - 200 pcs ✓                         │
│  • Building Sand - 10 tonnes ✓                         │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Client Name:                                           │
│  ┌──────────────────────────────────┐                  │
│  │ Jane Wanjiku                     │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  National ID (optional):                                │
│  ┌──────────────────────────────────┐                  │
│  │ 12345678                         │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  Signature:                                             │
│  ┌──────────────────────────────────────────────┐      │
│  │                                              │      │
│  │          [Signature Area]                    │      │
│  │                                              │      │
│  │                     ________                 │      │
│  │                                              │      │
│  └──────────────────────────────────────────────┘      │
│  [Clear Signature] [Use Touch ID]                      │
│                                                         │
│  Delivery Photos (3 required):                          │
│  ┌─────┐ ┌─────┐ ┌─────┐                              │
│  │[📷] │ │[📷] │ │[📷] │                              │
│  └─────┘ └─────┘ └─────┘                              │
│  [Take Photos]                                          │
│                                                         │
│  Additional Notes:                                      │
│  ┌──────────────────────────────────────────────┐      │
│  │ Delivered in good condition.                 │      │
│  │ Client satisfied with delivery.              │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
│  [Cancel] [Complete Delivery]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼ [Complete Delivery]


STEP 5: SYNC DATA & CONFIRM
════════════════════════════
┌─────────────────────────────────────────┐
│  📤 Uploading delivery data...          │
│                                         │
│  ✓ Signature uploaded                  │
│  ✓ Photos uploaded (3)                 │
│  ✓ Delivery status updated             │
│  ✓ Notifications sent                  │
│  ✓ Invoice generated                   │
│                                         │
│  [Processing...]                        │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  ✅ DELIVERY COMPLETED                                  │
│                                                         │
│  Delivery #DN-2024-089                                  │
│  Order #PO-2024-156                                     │
│                                                         │
│  Completed: 20 Nov 2024, 11:45 AM                      │
│  Delivered by: James Mwangi                             │
│  Received by: Jane Wanjiku                              │
│                                                         │
│  Receipt Number: REC-2024-156                           │
│                                                         │
│  📧 Email receipts sent to:                             │
│  • Client: jane@example.com                            │
│  • Supplier: orders@bamburi.com                        │
│  • Driver: james@mradipro.com                          │
│                                                         │
│  [View Receipt] [Print] [Next Delivery]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 4️⃣ INVENTORY SCANNING WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│          INVENTORY MANAGEMENT SCANNING                     │
└────────────────────────────────────────────────────────────┘

SCENARIO 1: STOCK RECEIVING
════════════════════════════

Warehouse receives new stock delivery
         │
         ▼
Open Scanner - "Stock In" mode
         │
         ▼
┌─────────────────────────────────────────┐
│  Stock Receiving                        │
├─────────────────────────────────────────┤
│  Supplier: Bamburi Cement Ltd           │
│  Delivery Note: DN-2024-089             │
│                                         │
│  [Scan Items]                           │
└─────────────────────────────────────────┘
         │
         ▼
Scan product barcodes one by one
         │
         ▼
┌─────────────────────────────────────────┐
│  📷 Scanning...                         │
│  ||||||||||||||||                       │
└──────────┬──────────────────────────────┘
           │
           ▼
Barcode: SKU-12345
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Item Scanned: Bamburi Cement 50kg                      │
├─────────────────────────────────────────────────────────┤
│  SKU: SKU-12345                                         │
│                                                         │
│  Quantity Received:                                     │
│  [  -  ]  [ 200 ]  [  +  ]                             │
│                                                         │
│  Batch Number:                                          │
│  ┌──────────────────────┐                              │
│  │ BATCH-2024-11-156    │                              │
│  └──────────────────────┘                              │
│                                                         │
│  Expiry Date:                                           │
│  ┌──────────────────────┐                              │
│  │ 20 Nov 2025          │                              │
│  └──────────────────────┘                              │
│                                                         │
│  Storage Location:                                      │
│  ┌──────────────────────┐                              │
│  │ Warehouse A, Sect 3  │                              │
│  └──────────────────────┘                              │
│                                                         │
│  Condition:                                             │
│  ● Good ✓                                              │
│  ○ Damaged                                             │
│                                                         │
│  Photo: [📷 Take Photo]                                 │
│                                                         │
│  [Add to Inventory] [Skip] [Report Issue]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼ [Add to Inventory]
Database updated
         │
         ├─► INSERT INTO inventory
         ├─► UPDATE stock levels
         └─► CREATE transaction log
         │
         ▼
┌─────────────────────────────────────────┐
│  ✅ Item Added to Inventory             │
│                                         │
│  Bamburi Cement 50kg                    │
│  + 200 bags                             │
│                                         │
│  New Stock Level: 650 bags              │
│                                         │
│  [Scan Next Item] [Finish]             │
└─────────────────────────────────────────┘
         │
         ▼
Continue scanning all items...
         │
         ▼
All items scanned (15 items)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Stock Receiving Complete                               │
├─────────────────────────────────────────────────────────┤
│  Items Received: 15                                     │
│  Total Value: KES 450,000                               │
│                                                         │
│  Summary:                                               │
│  • Cement products: 5 items                             │
│  • Steel products: 4 items                              │
│  • Sand & aggregates: 3 items                           │
│  • Other materials: 3 items                             │
│                                                         │
│  [View Details] [Generate Report] [Print]              │
│                                                         │
└─────────────────────────────────────────────────────────┘


SCENARIO 2: STOCK AUDIT
════════════════════════

Monthly inventory audit
         │
         ▼
Open Scanner - "Audit" mode
         │
         ▼
┌─────────────────────────────────────────┐
│  Stock Audit                            │
│  Date: 20 Nov 2024                      │
├─────────────────────────────────────────┤
│  Auditor: John Kimani                   │
│  Location: Warehouse A                  │
│                                         │
│  Expected Items: 234                    │
│  Scanned: 0                             │
│                                         │
│  [Start Scanning]                       │
└─────────────────────────────────────────┘
         │
         ▼
Scan each item in warehouse
         │
         ▼
For each scanned item:
┌─────────────────────────────────────────┐
│  Item: Bamburi Cement 50kg              │
│  SKU: SKU-12345                         │
│                                         │
│  System Count: 650 bags                 │
│  Physical Count: [ ___ ] bags           │
│                                         │
│  Discrepancy: ____                      │
│                                         │
│  [Confirm Count] [Report Issue]        │
└─────────────────────────────────────────┘
         │
         ▼
Continue audit...
         │
         ▼
Audit complete
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Audit Report                                           │
├─────────────────────────────────────────────────────────┤
│  Items Audited: 234                                     │
│  Matched: 228 ✓                                         │
│  Discrepancies: 6 ⚠                                    │
│                                                         │
│  Discrepancies Found:                                   │
│  • SKU-12345: -5 bags (shrinkage)                      │
│  • SKU-67890: +10 pcs (not recorded)                   │
│  • SKU-11111: Location mismatch                         │
│                                                         │
│  Audit Accuracy: 97.4%                                  │
│                                                         │
│  [Review Discrepancies] [Adjust Stock] [Export]        │
│                                                         │
└─────────────────────────────────────────────────────────┘


SCENARIO 3: QUICK STOCK CHECK
══════════════════════════════

Manager needs quick stock level
         │
         ▼
Scan product barcode
         │
         ▼
┌─────────────────────────────────────────┐
│  📊 QUICK STOCK CHECK                   │
├─────────────────────────────────────────┤
│  ┌────────┐                             │
│  │[Image] │  Bamburi Cement 50kg        │
│  └────────┘  SKU: SKU-12345             │
│                                         │
│  Current Stock: 650 bags                │
│  ┌──────────────────────────────┐       │
│  │ █████████████████░░░  82%    │       │
│  └──────────────────────────────┘       │
│                                         │
│  Min Level: 100 bags ✓                 │
│  Max Level: 800 bags                    │
│                                         │
│  Location: Warehouse A, Section 3       │
│  Last Updated: 5 mins ago               │
│                                         │
│  Reserved: 100 bags (2 orders)          │
│  Available: 550 bags                    │
│                                         │
│  [View Details] [Reorder] [Adjust]     │
│                                         │
└─────────────────────────────────────────┘
```

---

### 5️⃣ PAYMENT SCANNING WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│            PAYMENT QR CODE SCANNING                        │
└────────────────────────────────────────────────────────────┘

SCENARIO: Client scans invoice to pay
══════════════════════════════════════

STEP 1: CLIENT RECEIVES INVOICE
════════════════════════════════
Invoice email with QR code
         │
         ├─► PDF attachment
         └─► QR code for quick payment
         │
         ▼


STEP 2: SCAN INVOICE QR
═══════════════════════
Client opens MradiPro app
         │
         ▼
Tap "Pay Invoice"
         │
         ▼
Scanner opens
         │
         ▼
Scan invoice QR code
         │
         ▼
┌──────────────────────────────┐
│   📷 Scanning invoice...     │
│   Detecting QR code...       │
└──────────┬───────────────────┘
           │
           ▼
QR Code: INV-2024-156
         │
         ▼


STEP 3: LOAD INVOICE DETAILS
═════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  Invoice #INV-2024-156                                  │
│  Status: ⏳ UNPAID                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  From: Bamburi Cement Ltd                               │
│  To: John Kamau Construction                            │
│                                                         │
│  Order: PO-2024-156                                     │
│  Date: 18 Nov 2024                                      │
│  Due Date: 28 Nov 2024 (8 days remaining)              │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Items:                                                 │
│  • Cement 50kg - 100 bags       KES  80,000            │
│  • Steel Bars - 200 pcs         KES 150,000            │
│  • Building Sand - 10 tonnes    KES  20,000            │
│                                                         │
│  Subtotal:                      KES 250,000            │
│  Delivery:                      KES   5,000            │
│  VAT (16%):                     KES  40,800            │
│  ────────────────────────────────────────              │
│  TOTAL DUE:                     KES 295,800            │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Payment Method:                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   💳 Card    │  │  📱 M-Pesa   │  │  🏦 Bank    │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
│                                                         │
│  [Pay Now] [Save for Later] [Request Extension]        │
│                                                         │
└─────────────────────────────────────────────────────────┘


STEP 4: SELECT M-PESA PAYMENT
══════════════════════════════
User taps "M-Pesa"
         │
         ▼
┌─────────────────────────────────────────┐
│  💳 M-Pesa Payment                      │
├─────────────────────────────────────────┤
│  Amount: KES 295,800                    │
│                                         │
│  Phone Number:                          │
│  ┌──────────────────────┐               │
│  │ 0712 345 678         │               │
│  └──────────────────────┘               │
│  [Use Registered Number]                │
│                                         │
│  Payment will be sent to:               │
│  Bamburi Cement Ltd                     │
│  Paybill: 123456                        │
│                                         │
│  ⚠ You will receive an STK push        │
│     Enter your M-Pesa PIN to confirm   │
│                                         │
│  [Cancel] [Send Payment Request]       │
│                                         │
└─────────────────────────────────────────┘
         │
         ▼ [Send Payment Request]


STEP 5: PROCESS PAYMENT
════════════════════════
┌─────────────────────────────────────────┐
│  ⏳ Processing Payment...               │
├─────────────────────────────────────────┤
│  STK Push sent to 0712 345 678          │
│                                         │
│  Please enter your M-Pesa PIN on        │
│  your phone to complete payment         │
│                                         │
│  Waiting for confirmation...            │
│  [Spinner animation]                    │
│                                         │
│  This may take up to 60 seconds         │
│                                         │
│  [Cancel Payment]                       │
│                                         │
└─────────────────────────────────────────┘
         │
         ▼
User enters PIN on phone
         │
         ▼
M-Pesa processes payment
         │
         ▼
Callback received from Daraja API
         │
         ├─► Transaction ID
         ├─► Amount confirmed
         └─► Status: SUCCESS
         │
         ▼
Update database
         │
         ├─► Mark invoice as PAID
         ├─► Record transaction
         ├─► Update accounts
         └─► Send notifications
         │
         ▼


STEP 6: PAYMENT CONFIRMATION
═════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  ✅ PAYMENT SUCCESSFUL                                  │
├─────────────────────────────────────────────────────────┤
│  Invoice #INV-2024-156                                  │
│  Amount Paid: KES 295,800                               │
│                                                         │
│  Transaction Details:                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  M-Pesa Transaction ID: QR23ABC456                      │
│  Date: 20 Nov 2024, 11:50 AM                           │
│  From: 0712 345 678                                     │
│  To: Bamburi Cement Ltd (Paybill 123456)               │
│                                                         │
│  Payment Method: M-Pesa                                 │
│  Status: ✓ CONFIRMED                                   │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  Receipt Number: REC-2024-156                           │
│                                                         │
│  📧 Receipt sent to:                                    │
│  • Your email: john@example.com                        │
│  • SMS confirmation sent                                │
│                                                         │
│  [View Receipt] [Download PDF] [Share] [Done]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Receipt generated
         │
         ├─► PDF receipt
         ├─► Email sent
         ├─► SMS sent
         └─► In-app notification
```

---

## 🔧 Technical Implementation

### Scanner Component Architecture

```typescript
// Scanner Component Structure
┌────────────────────────────────────────────────────────┐
│  ScannerPage.tsx                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - Camera initialization                         │  │
│  │  - Permission handling                           │  │
│  │  - QR/Barcode detection                          │  │
│  │  - Result processing                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ScannerCamera.tsx                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - Video stream                                  │  │
│  │  - Camera controls (flash, switch)              │  │
│  │  - Overlay with scanning area                   │  │
│  │  - Visual feedback                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ScanResultModal.tsx                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - Display scanned data                          │  │
│  │  - Quick actions                                 │  │
│  │  - Navigation options                            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  useScannerHook.ts                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - Scanner state management                      │  │
│  │  - Data validation                               │  │
│  │  - API calls                                     │  │
│  │  - Error handling                                │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘


// Code Example: Scanner Hook
import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("reader");
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
      );
      
      setScanning(true);
    } catch (err) {
      setError("Failed to start scanner");
    }
  };

  const onScanSuccess = (decodedText: string) => {
    // Parse QR code data
    const scanData = parseQRCode(decodedText);
    
    // Validate format
    if (validateScanData(scanData)) {
      setResult(scanData);
      
      // Provide feedback
      vibrate();
      playBeep();
      
      // Fetch related data
      fetchScanData(scanData);
    }
  };

  const parseQRCode = (text: string) => {
    // Parse different QR code formats
    if (text.startsWith('PO-')) {
      return {
        type: 'PURCHASE_ORDER',
        id: text,
        timestamp: Date.now()
      };
    } else if (text.startsWith('SKU-')) {
      return {
        type: 'PRODUCT',
        sku: text,
        timestamp: Date.now()
      };
    }
    // ... handle other formats
  };

  return {
    scanning,
    result,
    error,
    startScanner,
    stopScanner
  };
};
```

### Database Schema for Scanning

```sql
-- Scan History Table
CREATE TABLE scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  scan_type VARCHAR(50) NOT NULL, -- 'ORDER', 'PRODUCT', 'DELIVERY', 'INVOICE'
  scan_data JSONB NOT NULL,
  scanned_at TIMESTAMP DEFAULT NOW(),
  location POINT, -- GPS coordinates
  device_info JSONB
);

-- QR Code Registry
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(255) UNIQUE NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'order', 'product', 'delivery'
  entity_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  scan_count INTEGER DEFAULT 0,
  metadata JSONB
);

-- Delivery Verification
CREATE TABLE delivery_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES deliveries(id),
  item_id UUID REFERENCES purchase_order_items(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  scanned_by UUID REFERENCES auth.users(id),
  quantity_verified INTEGER,
  condition VARCHAR(50), -- 'good', 'damaged', 'missing'
  photo_urls TEXT[],
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_scan_history_user ON scan_history(user_id);
CREATE INDEX idx_scan_history_type ON scan_history(scan_type);
CREATE INDEX idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
```

---

## 📊 Scanner Analytics Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  Scanner Usage Analytics                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Today's Scans: 234  ▲ 15%                                │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Scan Types Distribution                           │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │  Orders:    45% ████████████                      │   │
│  │  Products:  30% ████████                          │   │
│  │  Deliveries: 15% ████                             │   │
│  │  Payments:   10% ███                              │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Average Scan Time: 2.3 seconds                            │
│  Success Rate: 98.5%                                       │
│  Failed Scans: 3 (1.5%)                                   │
│                                                            │
│  Most Active Users:                                        │
│  1. James Mwangi (Driver) - 45 scans                      │
│  2. Peter Kamau (Warehouse) - 38 scans                    │
│  3. Mary Njeri (Supplier) - 29 scans                      │
│                                                            │
│  [View Detailed Report] [Export Data]                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Best Practices

### For Users:
1. **Good Lighting** - Ensure adequate light for scanning
2. **Steady Hold** - Keep device stable while scanning
3. **Correct Distance** - 10-15cm from QR code
4. **Clean Lens** - Keep camera lens clean
5. **Internet Connection** - Ensure stable connection for data sync

### For Developers:
1. **Error Handling** - Graceful fallbacks for scan failures
2. **Offline Support** - Cache scans when offline
3. **Performance** - Optimize scanning speed
4. **Security** - Validate and sanitize scanned data
5. **Accessibility** - Provide manual entry alternative

---

## 🔐 Security Features

```
SECURITY MEASURES
═════════════════

QR Code Validation
├── Check code format
├── Verify signature/hash
├── Check expiration
├── Validate permissions
└── Log all scans

Data Encryption
├── Encrypt QR code data
├── Use signed tokens
├── Implement rate limiting
└── Monitor suspicious activity

Access Control
├── Role-based scanning
├── Location verification
├── Time-based access
└── Device authentication
```

---

## 📱 Mobile Scanner Features

```
MOBILE OPTIMIZATIONS
════════════════════

Camera Features
├── Auto-focus
├── Flash control
├── Front/back camera switch
├── Zoom capability
└── Image stabilization

Performance
├── Fast detection (<2s)
├── Low battery usage
├── Minimal memory footprint
├── Background scanning
└── Batch scanning mode

User Experience
├── Visual feedback
├── Haptic feedback
├── Audio confirmation
├── Tutorial overlay
└── Quick actions
```

---

---

## 🏗️ BUILDER PURCHASE TO DISPATCH WORKFLOW
### Automatic QR Code Generation & Scanning

```
┌────────────────────────────────────────────────────────────────┐
│        COMPLETE PURCHASE-TO-DISPATCH QR WORKFLOW               │
└────────────────────────────────────────────────────────────────┘

PHASE 1: BUILDER PURCHASES ITEMS
═════════════════════════════════════════════════════════════════

STEP 1: Builder Creates Purchase Order
───────────────────────────────────────
Builder (Client) adds items to cart
         │
         ▼
┌──────────────────────────────────────┐
│  Shopping Cart                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  1. Cement 50kg - 100 bags          │
│  2. Steel Bars 12mm - 200 pcs       │
│  3. Building Sand - 10 tonnes       │
│                                      │
│  Total: KES 295,800                  │
│  [Checkout]                          │
└──────────────────────────────────────┘
         │
         ▼ [Checkout]
Review & Confirm Order
         │
         ▼


STEP 2: Order Confirmed - QR Codes Auto-Generated
──────────────────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  ✅ ORDER CONFIRMED                                      │
│  Order #PO-2024-156                                      │
│                                                          │
│  🔄 Generating QR Codes...                               │
│  ┌────────────────────────────────────────────────┐     │
│  │  [████████████████░░░░░░] 75%                  │     │
│  │  Creating unique QR codes for all items...     │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
         │
         ▼
System automatically creates:
         │
         ├─► ORDER QR CODE (Master)
         │   └─► Contains: Order ID, Client, Supplier, Total
         │
         ├─► ITEM QR CODES (Individual per item)
         │   ├─► Item 1: Cement - 100 bags
         │   │   └─► QR-PO2024156-ITEM001
         │   │
         │   ├─► Item 2: Steel Bars - 200 pcs
         │   │   └─► QR-PO2024156-ITEM002
         │   │
         │   └─► Item 3: Building Sand - 10 tonnes
         │       └─► QR-PO2024156-ITEM003
         │
         └─► DELIVERY QR CODE
             └─► Contains: Delivery address, Date, Instructions
         │
         ▼
All QR codes saved to database
         │
         ▼


STEP 3: Supplier Receives Order with QR Codes
──────────────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  📧 NEW ORDER NOTIFICATION                               │
│  To: supplier@bamburi.com                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  New order received from John Kamau Construction         │
│                                                          │
│  Order #PO-2024-156                                      │
│  Amount: KES 295,800                                     │
│  Delivery Date: 20 Nov 2024                              │
│                                                          │
│  📎 Attachments:                                         │
│  • Order Details PDF                                     │
│  • QR Code Labels (Printable)                           │
│  • Packing List                                          │
│                                                          │
│  [View Order] [Download QR Labels]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
Supplier clicks [Download QR Labels]
         │
         ▼


PHASE 2: SUPPLIER PRINTS QR LABELS
═════════════════════════════════════════════════════════════════

STEP 4: Print QR Code Labels
─────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  QR CODE LABELS - ORDER PO-2024-156                      │
│  Printable on A4 Label Paper                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ [QR CODE]          │  │ [QR CODE]          │         │
│  │  ▓▓▓▓▓▓▓▓▓▓       │  │  ▓▓▓▓▓▓▓▓▓▓       │         │
│  │  ▓▓    ▓▓▓▓       │  │  ▓▓    ▓▓▓▓       │         │
│  │  ▓▓▓▓▓▓▓▓▓▓       │  │  ▓▓▓▓▓▓▓▓▓▓       │         │
│  │                    │  │                    │         │
│  │ ITEM #001          │  │ ITEM #002          │         │
│  │ Cement 50kg        │  │ Steel Bars 12mm    │         │
│  │ Qty: 100 bags      │  │ Qty: 200 pcs       │         │
│  │                    │  │                    │         │
│  │ Order: PO-2024-156 │  │ Order: PO-2024-156 │         │
│  │ To: John Kamau     │  │ To: John Kamau     │         │
│  │ Date: 20 Nov 2024  │  │ Date: 20 Nov 2024  │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ [QR CODE]          │  │ [MASTER QR CODE]   │         │
│  │  ▓▓▓▓▓▓▓▓▓▓       │  │  ▓▓▓▓▓▓▓▓▓▓       │         │
│  │  ▓▓    ▓▓▓▓       │  │  ▓▓    ▓▓▓▓       │         │
│  │  ▓▓▓▓▓▓▓▓▓▓       │  │  ▓▓▓▓▓▓▓▓▓▓       │         │
│  │                    │  │                    │         │
│  │ ITEM #003          │  │ FULL ORDER         │         │
│  │ Building Sand      │  │ PO-2024-156        │         │
│  │ Qty: 10 tonnes     │  │ 3 Items            │         │
│  │                    │  │                    │         │
│  │ Order: PO-2024-156 │  │ Client: John Kamau │         │
│  │ To: John Kamau     │  │ KES 295,800        │         │
│  │ Date: 20 Nov 2024  │  │ Date: 20 Nov 2024  │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                          │
│  [Print Labels] [Print Packing List] [Save PDF]         │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Print Labels]
Labels printed on adhesive paper
         │
         ▼


STEP 5: Attach QR Labels to Items
──────────────────────────────────
Warehouse staff prepares order
         │
         ▼
For each item:
         │
         ├─► Pick item from stock
         ├─► Verify quantity
         ├─► Stick QR label on package
         └─► Move to staging area
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  WAREHOUSE FLOOR - STAGING AREA                          │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │  📦         │   │  📦         │   │  📦         │   │
│  │  Cement     │   │  Steel      │   │  Sand       │   │
│  │  100 bags   │   │  200 pcs    │   │  10 tonnes  │   │
│  │             │   │             │   │             │   │
│  │  [QR #001]  │   │  [QR #002]  │   │  [QR #003]  │   │
│  │  ▓▓▓▓▓▓     │   │  ▓▓▓▓▓▓     │   │  ▓▓▓▓▓▓     │   │
│  │  ▓▓  ▓▓     │   │  ▓▓  ▓▓     │   │  ▓▓  ▓▓     │   │
│  │  ▓▓▓▓▓▓     │   │  ▓▓▓▓▓▓     │   │  ▓▓▓▓▓▓     │   │
│  └─────────────┘   └─────────────┘   └─────────────┘   │
│                                                          │
│  Status: Ready for Loading                               │
│  Order: PO-2024-156                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
Items ready for loading with QR codes attached


PHASE 3: LOADING & DISPATCH SCANNING
═════════════════════════════════════════════════════════════════

STEP 6: Load Items - Scan QR Codes
───────────────────────────────────
Loader/Driver opens MradiPro Scanner
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  🚚 DISPATCH MODE                                        │
│  Order: PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Vehicle: KBX 123A                                       │
│  Driver: James Mwangi                                    │
│  Delivery Date: 20 Nov 2024                              │
│                                                          │
│  Items to Load: 3                                        │
│  Scanned: 0                                              │
│  Progress: [░░░░░░░░░░░░░░░░] 0%                        │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  📷 SCAN ITEMS AS YOU LOAD                               │
│                                                          │
│  [Start Scanning]                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Start Scanning]
Camera opens
         │
         ▼


STEP 7: Scan First Item QR Code
────────────────────────────────
Worker picks up first package (Cement)
         │
         ▼
Scan QR code on package
         │
         ▼
┌──────────────────────────────────────┐
│   📷 SCANNING QR CODE...             │
│   ┌────────────────────┐             │
│   │   ▓▓▓▓▓▓▓▓▓▓      │             │
│   │   ▓▓    ▓▓▓▓      │             │
│   │   ▓▓▓▓▓▓▓▓▓▓      │             │
│   └────────────────────┘             │
│   Detecting QR code...               │
└──────────┬───────────────────────────┘
           │
           ▼
QR Code detected: QR-PO2024156-ITEM001
         │
         ▼
Validate against order database
         │
         ├─► Check: Item belongs to this order? ✓
         ├─► Check: Already loaded? ✗
         └─► Check: Correct quantity? ✓
         │
         ▼ [VALIDATION PASSED]
┌──────────────────────────────────────────────────────────┐
│  ✅ ITEM VERIFIED                                        │
│  Scan #1 of 3                                            │
├──────────────────────────────────────────────────────────┤
│  ┌────────┐                                              │
│  │[Image] │  Bamburi Cement 50kg                         │
│  └────────┘  Item Code: QR-PO2024156-ITEM001            │
│                                                          │
│  ✓ Item matches order                                   │
│  ✓ Quantity correct: 100 bags                           │
│  ✓ Ready to load                                        │
│                                                          │
│  Confirm Loading:                                        │
│  Actual Quantity Loaded: [100] bags                      │
│                                                          │
│  Condition Check:                                        │
│  ● Good condition ✓                                     │
│  ○ Damaged (report)                                     │
│  ○ Shortage (report)                                    │
│                                                          │
│  Load Location in Vehicle:                               │
│  ○ Front    ● Middle    ○ Back                          │
│                                                          │
│  [Take Photo] [Confirm & Continue]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Confirm & Continue]
Update database
         │
         ├─► Mark item as LOADED
         ├─► Record timestamp
         ├─► Record loader (James Mwangi)
         ├─► Save photo
         └─► Update progress (1/3)
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  ✅ ITEM 1 LOADED                                        │
│                                                          │
│  Progress: 1/3 items                                     │
│  [████████░░░░░░░░░░░░] 33%                             │
│                                                          │
│  ✓ Cement 50kg - 100 bags                               │
│  ○ Steel Bars 12mm - 200 pcs (pending)                  │
│  ○ Building Sand - 10 tonnes (pending)                  │
│                                                          │
│  [Scan Next Item]                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Scan Next Item]


STEP 8: Continue Scanning All Items
────────────────────────────────────
Repeat for Item #2 (Steel Bars)
         │
         ▼
Scan QR-PO2024156-ITEM002
         │
         ▼
Verify & Confirm Loading
         │
         ▼
Progress: 2/3 (66%)
         │
         ▼
Repeat for Item #3 (Building Sand)
         │
         ▼
Scan QR-PO2024156-ITEM003
         │
         ▼
Verify & Confirm Loading
         │
         ▼
Progress: 3/3 (100%)
         │
         ▼


STEP 9: Complete Loading Verification
──────────────────────────────────────
All items scanned and loaded
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  ✅ ALL ITEMS LOADED                                     │
│  Order: PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Loading Summary:                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ✓ Cement 50kg - 100 bags                               │
│    Loaded: 11:20 AM | Location: Middle                  │
│    Condition: Good ✓                                     │
│                                                          │
│  ✓ Steel Bars 12mm - 200 pcs                            │
│    Loaded: 11:25 AM | Location: Back                    │
│    Condition: Good ✓                                     │
│                                                          │
│  ✓ Building Sand - 10 tonnes                            │
│    Loaded: 11:35 AM | Location: Front                   │
│    Condition: Good ✓                                     │
│                                                          │
│  Total Items: 3/3 ✓                                      │
│  Photos Captured: 6                                      │
│  Loading Time: 15 minutes                                │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  Vehicle Checklist:                                      │
│  ☑ All items loaded                                     │
│  ☑ Items secured                                        │
│  ☑ Load balanced                                        │
│  ☑ Vehicle inspected                                    │
│  ☐ Delivery documents ready                             │
│                                                          │
│  Driver Signature:                                       │
│  ┌──────────────────────────────────────┐               │
│  │  [Signature Pad]                     │               │
│  │              James Mwangi            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Generate Dispatch Note] [Mark Ready for Dispatch]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Mark Ready for Dispatch]


STEP 10: Generate Dispatch Note with QR
────────────────────────────────────────
System generates dispatch note
         │
         ├─► Create Dispatch Note ID: DN-2024-089
         ├─► Generate Dispatch QR Code
         ├─► Include all scanned items
         └─► Add tracking information
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  DISPATCH NOTE DN-2024-089                               │
│  Generated: 20 Nov 2024, 11:45 AM                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [DISPATCH QR CODE]                                      │
│  ┌──────────────┐                                        │
│  │  ▓▓▓▓▓▓▓▓▓▓  │  ← Scan this at delivery               │
│  │  ▓▓    ▓▓▓▓  │                                        │
│  │  ▓▓▓▓▓▓▓▓▓▓  │                                        │
│  └──────────────┘                                        │
│                                                          │
│  From: Bamburi Cement Ltd                                │
│  To: John Kamau Construction                             │
│  Delivery Address: Kilimani, Plot 123, Nairobi          │
│                                                          │
│  Order #: PO-2024-156                                    │
│  Dispatch #: DN-2024-089                                 │
│                                                          │
│  Vehicle: KBX 123A                                       │
│  Driver: James Mwangi (0712 XXX XXX)                    │
│                                                          │
│  Items Dispatched:                                       │
│  1. Cement 50kg - 100 bags [QR-001] ✓                   │
│  2. Steel Bars 12mm - 200 pcs [QR-002] ✓                │
│  3. Building Sand - 10 tonnes [QR-003] ✓                │
│                                                          │
│  Departure Time: 11:50 AM                                │
│  Expected Arrival: 1:00 PM                               │
│                                                          │
│  [Print] [Email] [Start GPS Tracking]                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Start GPS Tracking]
Order status updated: IN_TRANSIT
         │
         ├─► Client notified
         ├─► GPS tracking active
         └─► ETA calculated
         │
         ▼


PHASE 4: DELIVERY VERIFICATION SCANNING
═════════════════════════════════════════════════════════════════

STEP 11: Arrival at Delivery Site
──────────────────────────────────
Driver arrives at construction site
         │
         ▼
Open MradiPro Scanner
         │
         ▼
Scan Dispatch Note QR Code
         │
         ▼
┌──────────────────────────────────────┐
│  📷 Scanning Dispatch Note...        │
│  ┌────────────────────┐              │
│  │  ▓▓▓▓▓▓▓▓▓▓        │              │
│  │  ▓▓    ▓▓▓▓        │              │
│  │  ▓▓▓▓▓▓▓▓▓▓        │              │
│  └────────────────────┘              │
└──────────┬───────────────────────────┘
           │
           ▼
Dispatch Note detected: DN-2024-089
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  📍 ARRIVED AT DELIVERY LOCATION                         │
│  Dispatch: DN-2024-089                                   │
│  Order: PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Arrival Time: 1:05 PM                                   │
│  Expected: 1:00 PM (5 mins late)                        │
│                                                          │
│  Location Verified: ✓                                    │
│  • GPS: -1.2921, 36.8219                                │
│  • Address: Kilimani, Plot 123                          │
│                                                          │
│  Items to Offload: 3                                     │
│  ✓ All items loaded in warehouse                         │
│                                                          │
│  [Contact Client] [Start Offloading]                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Start Offloading]


STEP 12: Scan Items During Offloading
──────────────────────────────────────
Client present to receive delivery
         │
         ▼
For each item being offloaded:
         │
         ├─► Scan item QR code
         ├─► Verify with client
         ├─► Confirm condition
         └─► Mark as delivered
         │
         ▼
Scan QR-PO2024156-ITEM001 (Cement)
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  OFFLOADING VERIFICATION                                 │
│  Item 1 of 3                                             │
├──────────────────────────────────────────────────────────┤
│  ┌────────┐                                              │
│  │[Image] │  Bamburi Cement 50kg                         │
│  └────────┘  QR: QR-PO2024156-ITEM001                   │
│                                                          │
│  ✓ Loaded at: 11:20 AM (Warehouse)                      │
│  ✓ Now delivering: 1:10 PM (Site)                       │
│  ✓ Tracking verified                                     │
│                                                          │
│  Expected: 100 bags                                      │
│  Delivered: [100] bags                                   │
│                                                          │
│  Client Inspection:                                      │
│  ● Quantity correct ✓                                   │
│  ● Good condition ✓                                     │
│  ○ Report issue                                         │
│                                                          │
│  [Photo] [Client Confirm] [Report Problem]              │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Client Confirm]
Item marked as delivered
         │
         ▼
Repeat for all items...
         │
         ▼
All 3 items verified and delivered
         │
         ▼


STEP 13: Final Delivery Confirmation
─────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  ✅ DELIVERY COMPLETE                                    │
│  Order: PO-2024-156                                      │
│  Dispatch: DN-2024-089                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  All Items Delivered & Verified:                         │
│  ✓ Cement 50kg - 100 bags                               │
│  ✓ Steel Bars 12mm - 200 pcs                            │
│  ✓ Building Sand - 10 tonnes                            │
│                                                          │
│  Delivery Timeline:                                      │
│  • Loaded: 11:20 AM (Warehouse)                         │
│  • Departed: 11:50 AM                                    │
│  • Arrived: 1:05 PM                                      │
│  • Completed: 1:30 PM                                    │
│  Total Time: 2h 10m                                      │
│                                                          │
│  Client Signature:                                       │
│  ┌──────────────────────────────────────┐               │
│  │  Jane Wanjiku                        │               │
│  │  Signed: 1:30 PM                     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Generate Receipt] [Complete]                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
Receipt generated with full tracking history
         │
         ├─► All QR scans recorded
         ├─► Timestamps logged
         ├─► Photos attached
         └─► Parties notified
```

---

## 🔄 QR CODE DATA STRUCTURE

### Master Order QR Code
```json
{
  "type": "PURCHASE_ORDER",
  "orderId": "PO-2024-156",
  "clientId": "user_abc123",
  "supplierId": "supplier_xyz789",
  "orderDate": "2024-11-18T10:30:00Z",
  "deliveryDate": "2024-11-20",
  "totalAmount": 295800,
  "itemCount": 3,
  "status": "CONFIRMED",
  "qrVersion": "1.0",
  "signature": "SHA256_HASH_HERE"
}
```

### Individual Item QR Code
```json
{
  "type": "ORDER_ITEM",
  "itemQrCode": "QR-PO2024156-ITEM001",
  "orderId": "PO-2024-156",
  "itemId": "item_001",
  "productSku": "SKU-12345",
  "productName": "Bamburi Cement 50kg",
  "quantity": 100,
  "unit": "bags",
  "loadSequence": 1,
  "weight": 5000,
  "handlingInstructions": "Keep dry, stack max 10 high",
  "expiryDate": "2025-11-20",
  "batchNumber": "BATCH-2024-11-156",
  "qrGenerated": "2024-11-18T10:31:00Z",
  "signature": "SHA256_HASH_HERE"
}
```

### Dispatch Note QR Code
```json
{
  "type": "DISPATCH_NOTE",
  "dispatchId": "DN-2024-089",
  "orderId": "PO-2024-156",
  "vehicleReg": "KBX 123A",
  "driverId": "driver_123",
  "driverName": "James Mwangi",
  "driverPhone": "+254712345678",
  "departureTime": "2024-11-20T11:50:00Z",
  "expectedArrival": "2024-11-20T13:00:00Z",
  "deliveryAddress": {
    "location": "Kilimani, Plot 123, Nairobi",
    "gps": {"lat": -1.2921, "lng": 36.8219}
  },
  "itemsCount": 3,
  "itemQrCodes": [
    "QR-PO2024156-ITEM001",
    "QR-PO2024156-ITEM002",
    "QR-PO2024156-ITEM003"
  ],
  "loadingVerified": true,
  "signature": "SHA256_HASH_HERE"
}
```

---

## 📊 QR CODE TRACKING DATABASE

```sql
-- QR Code Generation & Tracking
CREATE TABLE qr_codes_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  qr_type VARCHAR(50) NOT NULL, -- 'ORDER', 'ITEM', 'DISPATCH'
  entity_id UUID NOT NULL,
  qr_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  printed BOOLEAN DEFAULT FALSE,
  printed_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- QR Scan Events Log
CREATE TABLE qr_scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code VARCHAR(255) REFERENCES qr_codes_tracking(qr_code),
  scan_type VARCHAR(50) NOT NULL, -- 'LOADING', 'DISPATCH', 'DELIVERY', 'VERIFICATION'
  scanned_by UUID REFERENCES auth.users(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  scan_location POINT, -- GPS coordinates
  scan_result VARCHAR(50), -- 'SUCCESS', 'ERROR', 'DUPLICATE'
  scan_data JSONB,
  device_info JSONB,
  photo_urls TEXT[]
);

-- Item Loading Verification
CREATE TABLE item_loading_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES purchase_orders(id),
  item_id UUID REFERENCES purchase_order_items(id),
  item_qr_code VARCHAR(255) REFERENCES qr_codes_tracking(qr_code),
  loaded_at TIMESTAMP DEFAULT NOW(),
  loaded_by UUID REFERENCES auth.users(id),
  quantity_loaded INTEGER NOT NULL,
  condition VARCHAR(50) DEFAULT 'GOOD', -- 'GOOD', 'DAMAGED', 'SHORTAGE'
  vehicle_location VARCHAR(50), -- 'FRONT', 'MIDDLE', 'BACK'
  verification_photos TEXT[],
  notes TEXT,
  verified BOOLEAN DEFAULT TRUE
);

-- Dispatch Verification
CREATE TABLE dispatch_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id UUID REFERENCES deliveries(id),
  dispatch_qr_code VARCHAR(255) REFERENCES qr_codes_tracking(qr_code),
  all_items_loaded BOOLEAN DEFAULT FALSE,
  items_scanned INTEGER DEFAULT 0,
  total_items INTEGER NOT NULL,
  driver_signature TEXT,
  supervisor_signature TEXT,
  departure_time TIMESTAMP,
  checklist_completed BOOLEAN DEFAULT FALSE,
  verification_complete BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_qr_tracking_code ON qr_codes_tracking(qr_code);
CREATE INDEX idx_qr_tracking_entity ON qr_codes_tracking(entity_id);
CREATE INDEX idx_qr_scan_events_code ON qr_scan_events(qr_code);
CREATE INDEX idx_qr_scan_events_time ON qr_scan_events(scanned_at);
CREATE INDEX idx_item_loading_order ON item_loading_verification(order_id);
```

---

## 🖨️ QR LABEL PRINTING SPECIFICATIONS

```
LABEL SPECIFICATIONS
════════════════════

Physical Dimensions:
├── Label Size: 100mm x 150mm
├── QR Code Size: 40mm x 40mm
├── Material: Waterproof adhesive paper
├── Adhesive: Permanent
└── Finish: Matte/Glossy

QR Code Technical:
├── Format: QR Code (not barcode)
├── Version: Auto (based on data)
├── Error Correction: Level H (30%)
├── Encoding: UTF-8
└── Color: Black on white background

Label Layout:
┌──────────────────────────┐
│  MRADIPRO LOGO (top)     │
│                          │
│  ┌────────────────┐      │
│  │  [QR CODE]     │      │
│  │   40mm x 40mm  │      │
│  └────────────────┘      │
│                          │
│  Item: Cement 50kg       │  ← Bold, 14pt
│  SKU: SKU-12345          │  ← Regular, 10pt
│  Qty: 100 bags           │  ← Bold, 12pt
│                          │
│  Order: PO-2024-156      │  ← Regular, 9pt
│  Item #: 001             │  ← Regular, 9pt
│  Client: John Kamau      │  ← Regular, 9pt
│  Date: 20 Nov 2024       │  ← Regular, 9pt
│                          │
│  HANDLE WITH CARE        │  ← Icon + Text
│  KEEP DRY                │  ← Icon + Text
└──────────────────────────┘

Print Settings:
├── DPI: 300 minimum
├── Format: PDF or PNG
├── Color: Full color
└── Printer: Label printer or Laser
```

---

## 📱 MOBILE APP QR FEATURES

```
LOADING ASSISTANT APP (for warehouse staff)
═══════════════════════════════════════════

Features:
├── Batch QR Scanning
│   └── Scan multiple items quickly
├── Voice Confirmation
│   └── "Item loaded" verbal confirmation
├── Offline Mode
│   └── Cache scans, sync when online
├── Photo Auto-capture
│   └── Take photo with each scan
├── Progress Tracking
│   └── Real-time loading progress
└── Quality Checks
    └── Condition assessment per item


DISPATCHER APP (for drivers)
═════════════════════════════

Features:
├── Dispatch QR Generation
│   └── Create dispatch note QR
├── Pre-departure Checklist
│   └── Verify all items scanned
├── GPS Integration
│   └── Start tracking on dispatch
├── Client Communication
│   └── Send ETA updates
├── Delivery Verification
│   └── Scan items at delivery
└── Digital Signatures
    └── Client signature capture


DELIVERY SCANNER (for clients)
═══════════════════════════════

Features:
├── Quick Item Verification
│   └── Scan to verify authenticity
├── Quantity Confirmation
│   └── Check loaded vs delivered
├── Quality Inspection
│   └── Report issues immediately
├── Delivery History
│   └── View all scanned items
└── Receipt Generation
    └── Instant digital receipt
```

---

## 🚀 Future Enhancements

1. **AR Scanning** - Augmented reality overlays
2. **Voice Commands** - "Scan order PO-123"
3. **Batch Scanning** - Scan multiple items at once
4. **AI Recognition** - Identify products without barcodes
5. **Blockchain Verification** - Immutable scan records
6. **NFC Integration** - Tap-to-scan for quick verification
7. **Smart Packaging** - IoT sensors with QR codes
8. **Predictive Loading** - AI suggests optimal load sequence

---

## 📞 Scanner Support

**Common Issues:**
- Camera not working → Check permissions
- QR not detected → Improve lighting
- Slow scanning → Update app
- Failed scans → Manual entry option

**Help Resources:**
- 📚 Scanner Tutorial: help.mradipro.com/scanner
- 🎥 Video Guide: Available in app
- 💬 Live Support: Available 24/7

---

**MradiPro Scanner** - *Scan. Verify. Track. Build Better.* 📱✨

