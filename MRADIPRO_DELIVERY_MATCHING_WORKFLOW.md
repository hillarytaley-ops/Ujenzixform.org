# MradiPro Automated Delivery Matching System
## Smart Delivery Provider Selection & Assignment

---

## 🎯 Overview

The MradiPro Delivery Matching System automatically connects builders with the best-suited delivery providers based on location, vehicle capacity, and availability. The system activates immediately after a purchase order is confirmed.

---

## 🔄 Complete Delivery Matching Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│          AUTOMATED DELIVERY PROVIDER MATCHING SYSTEM            │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: PURCHASE ORDER COMPLETION
═══════════════════════════════════════════════════════════════════

Builder completes purchase order
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Shopping Cart - Checkout                                │
├──────────────────────────────────────────────────────────┤
│  Items (3):                                              │
│  • Cement 50kg - 100 bags                               │
│  • Steel Bars 12mm - 200 pcs                            │
│  • Building Sand - 10 tonnes                            │
│                                                          │
│  Subtotal: KES 250,000                                   │
│  Supplier: Bamburi Cement Ltd                            │
│                                                          │
│  Delivery Address:                                       │
│  Kilimani, Plot 123, Nairobi                            │
│  📍 GPS: -1.2921, 36.8219                               │
│                                                          │
│  [Confirm Order]                                         │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Confirm Order]
Order processing...
         │
         ▼


PHASE 2: AUTOMATIC DELIVERY PROMPT
═══════════════════════════════════════════════════════════════════

STEP 1: Instant Delivery Service Prompt
────────────────────────────────────────
System calculates order details
         │
         ├─► Total Weight: 7.5 tonnes
         ├─► Total Volume: 12 m³
         ├─► Distance: 15 km
         ├─► Fragile items: No
         └─► Special requirements: None
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  ✅ ORDER CONFIRMED                                      │
│  Order #PO-2024-156                                      │
│  Amount: KES 295,800                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🚚 DELIVERY SERVICE NEEDED?                             │
│                                                          │
│  Your order details:                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Weight: 7.5 tonnes                                   │
│  • Volume: 12 cubic meters                              │
│  • Distance: 15 km (Bamburi → Kilimani)                │
│  • Items: 3 (Construction materials)                    │
│                                                          │
│  Estimated Delivery Cost: KES 4,500 - 6,000             │
│  Delivery Time: Same day / Next day                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  ✓ Yes, I need delivery service                │     │
│  │    (Recommended - 15 providers available)      │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  ○ No, I'll arrange my own transport           │     │
│  │    (You can request delivery later)            │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  [Continue]                                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ User selects "Yes, I need delivery service"


STEP 2: Delivery Preferences
─────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  Delivery Preferences                                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  When do you need delivery?                              │
│  ● As soon as possible                                  │
│  ○ Schedule for specific date/time                      │
│                                                          │
│  Preferred Delivery Date:                                │
│  ┌──────────────────────┐                               │
│  │ 20 Nov 2024 ▼        │  (Today/Tomorrow)             │
│  └──────────────────────┘                               │
│                                                          │
│  Preferred Time Window:                                  │
│  ┌──────────────────────┐                               │
│  │ 08:00 - 12:00 ▼      │                               │
│  └──────────────────────┘                               │
│                                                          │
│  Special Requirements: (optional)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Need help with offloading                       │    │
│  │ Site has limited access                         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Access to delivery location:                            │
│  ☑ Paved road access                                    │
│  ☐ Requires 4x4 vehicle                                 │
│  ☐ Narrow streets                                       │
│  ☐ Height restrictions                                  │
│                                                          │
│  [Find Delivery Providers]                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Find Delivery Providers]


PHASE 3: SMART PROVIDER MATCHING
═══════════════════════════════════════════════════════════════════

STEP 3: System Calculates Requirements
───────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  🔍 FINDING BEST DELIVERY PROVIDERS...                   │
│  [Progress animation]                                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Calculating vehicle requirements                     │
│  ✓ Searching nearby providers                           │
│  ✓ Checking vehicle availability                        │
│  ✓ Verifying capacity match                             │
│  ✓ Calculating routes & costs                           │
│                                                          │
└──────────────────────────────────────────────────────────┘

System Processing:
         │
         ├─► Calculate Required Vehicle Capacity
         │   ├─► Weight: 7.5 tonnes
         │   ├─► Volume: 12 m³
         │   └─► Required: Medium truck (10-15 tonne capacity)
         │
         ├─► Find Suppliers Location
         │   └─► Bamburi Cement Ltd
         │       ├─► Address: Industrial Area, Nairobi
         │       └─► GPS: -1.3167, 36.8833
         │
         ├─► Search Radius for Providers
         │   └─► Within 20 km of supplier
         │       └─► Priority: Providers within 10 km
         │
         ├─► Filter by Vehicle Capacity
         │   └─► Query database:
         │       SELECT * FROM delivery_providers
         │       WHERE active = true
         │       AND available = true
         │       AND vehicle_capacity >= 7.5
         │       AND ST_Distance(location, supplier_location) <= 20000
         │       ORDER BY distance ASC, rating DESC
         │
         └─► Check Availability
             └─► Provider must be available on delivery date


STEP 4: Provider Selection Algorithm
─────────────────────────────────────

MATCHING CRITERIA:
═════════════════

1. VEHICLE CAPACITY (Weight-based)
   ├─► Light: < 2 tonnes (Pickup trucks)
   ├─► Medium: 2-10 tonnes (Small trucks)
   ├─► Heavy: 10-20 tonnes (Large trucks)
   └─► Extra Heavy: > 20 tonnes (Trailers)

2. DISTANCE FROM SUPPLIER
   ├─► Zone 1: 0-5 km (Highest priority)
   ├─► Zone 2: 5-10 km (High priority)
   ├─► Zone 3: 10-15 km (Medium priority)
   └─► Zone 4: 15-20 km (Low priority)

3. PROVIDER RATING
   ├─► 5 stars: Premium providers
   ├─► 4+ stars: Excellent providers
   ├─► 3+ stars: Good providers
   └─► < 3 stars: Not recommended

4. AVAILABILITY STATUS
   ├─► Available now: Immediate dispatch
   ├─► Available today: Same day delivery
   ├─► Available tomorrow: Next day delivery
   └─► Scheduled: Future date availability

5. VEHICLE SPECIFICATIONS
   ├─► Open truck: General materials
   ├─► Covered truck: Protected materials
   ├─► Flatbed: Large/long items
   ├─► Tipper: Sand, aggregates
   └─► Specialized: Fragile/hazardous

6. PRICING
   ├─► Budget: Basic service
   ├─► Standard: Reliable service
   └─► Premium: Full service with helpers

7. COMPLETION RATE
   ├─► > 95%: Highly reliable
   ├─► 90-95%: Reliable
   ├─► 80-90%: Acceptable
   └─► < 80%: Review needed

System finds: 15 matching providers
Filter by capacity: 8 providers
Sort by distance + rating: Top 5 providers selected
         │
         ▼


PHASE 4: NOTIFY DELIVERY PROVIDERS
═══════════════════════════════════════════════════════════════════

STEP 5: Send Notifications to Top Providers
────────────────────────────────────────────

System sends simultaneous notifications to 5 providers
         │
         ├─► Provider 1: Swift Transport (3.2 km away)
         ├─► Provider 2: Quick Logistics (4.8 km away)
         ├─► Provider 3: Prime Movers (5.5 km away)
         ├─► Provider 4: City Haulage (6.2 km away)
         └─► Provider 5: Metro Deliveries (7.1 km away)

Notification Methods:
         │
         ├─► Push Notification (Instant)
         ├─► SMS Alert
         ├─► Email
         └─► In-app notification


PROVIDER 1 RECEIVES NOTIFICATION:
═════════════════════════════════

Mobile App Alert:
┌──────────────────────────────────────────────────────────┐
│  🔔 NEW DELIVERY REQUEST                                 │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📍 PICKUP LOCATION                                      │
│  Bamburi Cement Ltd                                      │
│  Industrial Area, Nairobi                                │
│  📏 3.2 km from your location                            │
│                                                          │
│  📍 DELIVERY LOCATION                                    │
│  Kilimani, Plot 123, Nairobi                            │
│  📏 15 km from pickup                                    │
│                                                          │
│  📦 LOAD DETAILS                                         │
│  • Weight: 7.5 tonnes ✓ (Your capacity: 10 tonnes)     │
│  • Volume: 12 m³                                         │
│  • Items: 3 (Construction materials)                     │
│                                                          │
│  🚚 VEHICLE REQUIRED                                     │
│  Medium Truck (10 tonne capacity)                        │
│  Your available vehicle: KBX 123A ✓                      │
│                                                          │
│  📅 DELIVERY DATE                                        │
│  20 Nov 2024, 08:00 - 12:00                             │
│                                                          │
│  💰 ESTIMATED EARNINGS                                   │
│  KES 5,500 (Platform fee: KES 550)                      │
│  Net: KES 4,950                                          │
│                                                          │
│  ⏱️ TIME TO RESPOND: 5 minutes                          │
│  [███████████░░░░░] 3:45 remaining                       │
│                                                          │
│  Other providers notified: 4                             │
│  First to accept gets the job!                           │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  ✅ ACCEPT     │  │  ❌ REJECT     │                 │
│  │  Take Job      │  │  Decline       │                 │
│  └────────────────┘  └────────────────┘                 │
│                                                          │
│  [View Full Details] [View Route]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘

⏰ COUNTDOWN TIMER: 5 MINUTES
If no response, offer goes to next provider


STEP 6: Provider Reviews Details
─────────────────────────────────

Provider taps [View Full Details]
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Delivery Request - Full Details                         │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📊 ORDER BREAKDOWN                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  Item 1: Cement 50kg                                     │
│  • Quantity: 100 bags                                   │
│  • Weight: 5,000 kg (5 tonnes)                          │
│  • Packaging: Bags                                       │
│  • Handling: Standard                                    │
│                                                          │
│  Item 2: Steel Bars 12mm                                 │
│  • Quantity: 200 pieces                                 │
│  • Weight: 1,500 kg (1.5 tonnes)                        │
│  • Length: 6 meters                                      │
│  • Handling: Secure properly                             │
│                                                          │
│  Item 3: Building Sand                                   │
│  • Quantity: 10 tonnes (loose)                          │
│  • Weight: 1,000 kg (1 tonne)                           │
│  • Packaging: Bulk                                       │
│  • Handling: Covered transport preferred                 │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  🗺️ ROUTE INFORMATION                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  Current Location → Pickup: 3.2 km (10 mins)           │
│  Pickup → Delivery: 15 km (35 mins)                     │
│  Total Distance: 18.2 km                                 │
│  Estimated Time: 45 minutes + loading time              │
│                                                          │
│  [View Map] [Get Directions]                            │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  💰 PAYMENT BREAKDOWN                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  Base Rate (15 km):           KES 3,000                 │
│  Weight Surcharge (7.5t):     KES 1,500                 │
│  Time Window Bonus:           KES 500                   │
│  Loading/Offloading:          KES 500                   │
│  ─────────────────────────────────────                  │
│  Subtotal:                    KES 5,500                 │
│  Platform Fee (10%):         -KES 550                   │
│  ─────────────────────────────────────                  │
│  Your Net Earnings:           KES 4,950                 │
│                                                          │
│  Payment: Direct to your account after delivery         │
│  Expected payment: Same day                              │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  👤 CLIENT INFORMATION                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  Name: John Kamau Construction                           │
│  Rating: ⭐⭐⭐⭐⭐ 4.9/5.0                               │
│  Previous Orders: 23                                     │
│  On-time Payment: 100%                                   │
│  Phone: 0712 XXX XXX (visible after accept)             │
│                                                          │
│  Special Instructions:                                   │
│  "Need help with offloading. Site has limited           │
│  access. Please call 30 mins before arrival."           │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ⚠️ REQUIREMENTS                                         │
│  • Vehicle capacity: Min 7.5 tonnes ✓                   │
│  • Available: 20 Nov 2024 ✓                             │
│  • Valid insurance ✓                                     │
│  • Driver license ✓                                      │
│  • 2 helpers recommended                                 │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ⏱️ TIME REMAINING TO RESPOND: 3:12                     │
│                                                          │
│  ┌─────────────────────────┐  ┌────────────────────┐   │
│  │  ✅ ACCEPT THIS JOB     │  │  ❌ DECLINE        │   │
│  │  Earn KES 4,950         │  │                    │   │
│  └─────────────────────────┘  └────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘


STEP 7: Provider Accepts Job
─────────────────────────────

Provider taps [ACCEPT THIS JOB]
         │
         ▼
Confirm acceptance
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Confirm Job Acceptance                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Please confirm you can deliver:                         │
│                                                          │
│  ☑ I have verified vehicle capacity (7.5t)              │
│  ☑ I will be available on 20 Nov 2024                   │
│  ☑ I accept the terms and payment (KES 4,950)          │
│  ☑ I have read special instructions                     │
│                                                          │
│  Select vehicle for this delivery:                       │
│  ● KBX 123A - Canter 10T (Available) ✓                 │
│  ○ KBZ 456B - Isuzu 7T (On another job)                │
│                                                          │
│  Assign driver:                                          │
│  ● James Mwangi (You)                                   │
│  ○ Other driver                                         │
│                                                          │
│  [Cancel] [Confirm & Accept Job]                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼ [Confirm & Accept Job]


STEP 8: Job Assigned - Notify All Parties
──────────────────────────────────────────

System Updates:
         │
         ├─► Mark job as ASSIGNED
         ├─► Assign to Swift Transport
         ├─► Cancel notifications to other 4 providers
         ├─► Notify builder of assignment
         └─► Update order status


BUILDER NOTIFICATION:
════════════════════

┌──────────────────────────────────────────────────────────┐
│  ✅ DELIVERY PROVIDER ASSIGNED                           │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Your delivery has been assigned to:                     │
│                                                          │
│  🚚 Swift Transport                                      │
│  Rating: ⭐⭐⭐⭐⭐ 4.8/5.0 (234 deliveries)             │
│                                                          │
│  Driver: James Mwangi                                    │
│  Phone: 0712 345 678                                     │
│  Vehicle: KBX 123A (Canter 10T)                         │
│                                                          │
│  📅 Scheduled Delivery:                                  │
│  20 Nov 2024, 08:00 - 12:00                             │
│                                                          │
│  💰 Delivery Fee: KES 5,500                              │
│  Total Order: KES 301,300                                │
│                                                          │
│  Pickup Location:                                        │
│  Bamburi Cement Ltd, Industrial Area                     │
│                                                          │
│  Delivery Location:                                      │
│  Kilimani, Plot 123, Nairobi                            │
│                                                          │
│  [Contact Driver] [View Delivery Details] [Track]       │
│                                                          │
└──────────────────────────────────────────────────────────┘


PROVIDER CONFIRMATION:
═════════════════════

┌──────────────────────────────────────────────────────────┐
│  🎉 JOB CONFIRMED                                        │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  You have successfully accepted this delivery!           │
│                                                          │
│  📋 NEXT STEPS:                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  1. Prepare Vehicle KBX 123A                            │
│     □ Fuel check                                        │
│     □ Vehicle inspection                                │
│     □ Load securing equipment                           │
│                                                          │
│  2. Arrive at Pickup                                     │
│     Date: 20 Nov 2024, 08:00 AM                         │
│     Location: Bamburi Cement Ltd                         │
│     📍 3.2 km from you (10 mins drive)                  │
│                                                          │
│  3. Load Items (Scan QR codes)                          │
│     Expected loading time: 30 mins                       │
│                                                          │
│  4. Deliver to Client                                    │
│     Location: Kilimani, Plot 123                         │
│     Contact: John Kamau (0712 XXX XXX)                  │
│                                                          │
│  5. Get Signature & Complete                             │
│     Payment released after confirmation                  │
│                                                          │
│  [View Job Details] [Get Directions] [Contact Client]   │
│  [Add to Calendar]                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘


OTHER PROVIDERS NOTIFIED:
════════════════════════

┌──────────────────────────────────────────────────────────┐
│  ⏱️ JOB FILLED                                           │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  This delivery has been assigned to another provider.    │
│                                                          │
│  Assigned to: Swift Transport                            │
│  Response time: 2 minutes 15 seconds                     │
│                                                          │
│  Don't worry! More jobs are coming your way.             │
│                                                          │
│  💡 Tip: Respond faster to increase your chances!        │
│     Average response time: 3 minutes                     │
│     Your average: 4 minutes                              │
│                                                          │
│  [View Available Jobs] [Update Availability]            │
│                                                          │
└──────────────────────────────────────────────────────────┘


SUPPLIER NOTIFICATION:
═════════════════════

┌──────────────────────────────────────────────────────────┐
│  🚚 DELIVERY ARRANGED                                    │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Delivery provider has been assigned for this order.     │
│                                                          │
│  Provider: Swift Transport                               │
│  Driver: James Mwangi (0712 345 678)                    │
│  Vehicle: KBX 123A                                       │
│                                                          │
│  📅 Pickup Scheduled:                                    │
│  20 Nov 2024, 08:00 AM                                   │
│                                                          │
│  Please have order ready for loading:                    │
│  • Cement 50kg - 100 bags                               │
│  • Steel Bars 12mm - 200 pcs                            │
│  • Building Sand - 10 tonnes                            │
│                                                          │
│  QR code labels have been generated.                     │
│  [Download Labels] [View Order]                         │
│                                                          │
└──────────────────────────────────────────────────────────┘


PHASE 5: FALLBACK SCENARIOS
═══════════════════════════════════════════════════════════════════

SCENARIO A: No Provider Accepts (5 min timeout)
────────────────────────────────────────────────

Timer expires → No response from first 5 providers
         │
         ▼
System automatically:
         │
         ├─► Extends search radius to 30 km
         ├─► Finds next 5 providers
         ├─► Sends notifications again
         └─► Increases response time to 10 minutes
         │
         ▼
If still no response:
         │
         ├─► Notify builder of delay
         ├─► Offer to increase delivery fee
         └─► Manual assignment by admin


SCENARIO B: All Providers Reject
─────────────────────────────────

All notified providers reject job
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  ⚠️ DELIVERY PROVIDER SEARCH                             │
│  Order #PO-2024-156                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  We're having difficulty finding a delivery provider     │
│  for your order.                                         │
│                                                          │
│  Possible reasons:                                       │
│  • High demand in your area                             │
│  • Specific delivery time not available                 │
│  • All providers currently booked                       │
│                                                          │
│  RECOMMENDED OPTIONS:                                    │
│                                                          │
│  1. ⏰ Flexible Delivery Time                           │
│     Change to: Any time tomorrow                         │
│     [Select Different Time]                              │
│                                                          │
│  2. 💰 Increase Delivery Fee                            │
│     Current: KES 5,500                                   │
│     Suggested: KES 6,500 (+KES 1,000)                   │
│     [Increase Fee]                                       │
│                                                          │
│  3. 🚚 Self Arrangement                                 │
│     Arrange your own transport                           │
│     [I'll Arrange Transport]                             │
│                                                          │
│  4. 📞 Contact Support                                   │
│     Our team will manually find a provider               │
│     [Contact Support]                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘


SCENARIO C: Multiple Providers Accept Simultaneously
─────────────────────────────────────────────────────

Two providers click accept at same time
         │
         ▼
System uses timestamp:
         │
         ├─► Provider 1: 10:15:23.456
         ├─► Provider 2: 10:15:23.789
         │
         ▼
Provider 1 wins (earlier timestamp)
         │
         ├─► Assign to Provider 1
         ├─► Notify Provider 1: Success
         └─► Notify Provider 2: Job already filled
```

---

## 🗄️ DATABASE SCHEMA

```sql
-- Delivery Providers Table
CREATE TABLE delivery_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  license_number VARCHAR(100),
  insurance_number VARCHAR(100),
  insurance_expiry DATE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  cancelled_deliveries INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Location
  base_location POINT NOT NULL, -- GPS coordinates
  address TEXT,
  service_radius INTEGER DEFAULT 50, -- km
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  availability_schedule JSONB, -- Weekly schedule
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  documents JSONB, -- License, insurance, etc.
  
  -- Financial
  bank_account VARCHAR(50),
  bank_name VARCHAR(100),
  mpesa_number VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Provider Vehicles
CREATE TABLE delivery_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES delivery_providers(id),
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL, -- 'PICKUP', 'SMALL_TRUCK', 'LARGE_TRUCK', 'TRAILER'
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  
  -- Capacity
  weight_capacity DECIMAL(10,2) NOT NULL, -- in tonnes
  volume_capacity DECIMAL(10,2), -- in cubic meters
  length DECIMAL(10,2), -- meters
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  
  -- Specifications
  is_covered BOOLEAN DEFAULT FALSE,
  is_refrigerated BOOLEAN DEFAULT FALSE,
  has_crane BOOLEAN DEFAULT FALSE,
  has_tailgate_lift BOOLEAN DEFAULT FALSE,
  features JSONB, -- Additional features
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  current_location POINT, -- GPS tracking
  last_location_update TIMESTAMP,
  
  -- Insurance & Documentation
  insurance_number VARCHAR(100),
  insurance_expiry DATE,
  inspection_date DATE,
  
  -- Photos
  photos TEXT[], -- Vehicle photos
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Requests (Matching System)
CREATE TABLE delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES purchase_orders(id),
  builder_id UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES suppliers(id),
  
  -- Request Details
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'MATCHING', 'ASSIGNED', 'REJECTED', 'CANCELLED'
  
  -- Load Requirements
  total_weight DECIMAL(10,2) NOT NULL, -- tonnes
  total_volume DECIMAL(10,2), -- cubic meters
  item_count INTEGER,
  items_summary JSONB,
  
  -- Route Information
  pickup_location POINT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_location POINT NOT NULL,
  delivery_address TEXT NOT NULL,
  distance DECIMAL(10,2), -- km
  
  -- Timing
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,
  preferred_time_end TIME,
  is_flexible BOOLEAN DEFAULT FALSE,
  urgency VARCHAR(20) DEFAULT 'NORMAL', -- 'URGENT', 'NORMAL', 'FLEXIBLE'
  
  -- Special Requirements
  requires_helpers BOOLEAN DEFAULT FALSE,
  helper_count INTEGER DEFAULT 0,
  special_equipment JSONB,
  access_restrictions TEXT,
  special_instructions TEXT,
  
  -- Pricing
  estimated_cost DECIMAL(10,2),
  offered_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  
  -- Matching
  notified_providers UUID[], -- Array of provider IDs
  notification_sent_at TIMESTAMP,
  response_deadline TIMESTAMP,
  assigned_provider_id UUID REFERENCES delivery_providers(id),
  assigned_at TIMESTAMP,
  
  -- Tracking
  search_radius INTEGER DEFAULT 20, -- km
  search_attempts INTEGER DEFAULT 0,
  last_search_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Provider Notifications Log
CREATE TABLE delivery_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_request_id UUID REFERENCES delivery_requests(id),
  provider_id UUID REFERENCES delivery_providers(id),
  
  -- Notification
  notification_type VARCHAR(50), -- 'NEW_REQUEST', 'REMINDER', 'CANCELLED'
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_method VARCHAR(50), -- 'PUSH', 'SMS', 'EMAIL'
  
  -- Response
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP,
  response VARCHAR(20), -- 'ACCEPTED', 'REJECTED', 'TIMEOUT', NULL
  response_at TIMESTAMP,
  response_time INTEGER, -- seconds
  rejection_reason TEXT,
  
  -- Details shown to provider
  shown_details JSONB, -- What was shown in notification
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider Responses
CREATE TABLE delivery_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_request_id UUID REFERENCES delivery_requests(id),
  provider_id UUID REFERENCES delivery_providers(id),
  vehicle_id UUID REFERENCES delivery_vehicles(id),
  
  response VARCHAR(20) NOT NULL, -- 'ACCEPTED', 'REJECTED'
  response_time TIMESTAMP DEFAULT NOW(),
  
  -- If rejected
  rejection_reason VARCHAR(100),
  rejection_details TEXT,
  
  -- If accepted
  proposed_price DECIMAL(10,2),
  estimated_pickup_time TIME,
  estimated_delivery_time TIME,
  assigned_driver UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Status
  is_winner BOOLEAN DEFAULT FALSE, -- If multiple accept, only one wins
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Assignments
CREATE TABLE delivery_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_request_id UUID REFERENCES delivery_requests(id),
  order_id UUID REFERENCES purchase_orders(id),
  provider_id UUID REFERENCES delivery_providers(id),
  vehicle_id UUID REFERENCES delivery_vehicles(id),
  driver_id UUID REFERENCES auth.users(id),
  
  -- Assignment
  assigned_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  
  -- Pricing
  agreed_price DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  provider_earnings DECIMAL(10,2),
  
  -- Schedule
  scheduled_pickup_date DATE,
  scheduled_pickup_time TIME,
  scheduled_delivery_date DATE,
  scheduled_delivery_time TIME,
  
  -- Tracking
  pickup_arrived_at TIMESTAMP,
  loading_started_at TIMESTAMP,
  loading_completed_at TIMESTAMP,
  departed_at TIMESTAMP,
  delivery_arrived_at TIMESTAMP,
  offloading_started_at TIMESTAMP,
  offloading_completed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Verification
  items_loaded_count INTEGER,
  items_delivered_count INTEGER,
  client_signature TEXT,
  delivery_photos TEXT[],
  
  -- Rating & Review
  client_rating INTEGER,
  client_review TEXT,
  provider_rating INTEGER,
  provider_review TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX idx_delivery_providers_location ON delivery_providers USING GIST(base_location);
CREATE INDEX idx_delivery_providers_available ON delivery_providers(is_available, is_active);
CREATE INDEX idx_delivery_vehicles_provider ON delivery_vehicles(provider_id);
CREATE INDEX idx_delivery_vehicles_available ON delivery_vehicles(is_available, is_active);
CREATE INDEX idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX idx_delivery_requests_pickup ON delivery_requests USING GIST(pickup_location);
CREATE INDEX idx_delivery_notifications_provider ON delivery_notifications(provider_id, viewed);
CREATE INDEX idx_delivery_responses_request ON delivery_responses(delivery_request_id);
CREATE INDEX idx_delivery_assignments_order ON delivery_assignments(order_id);
```

---

## 🔧 IMPLEMENTATION CODE EXAMPLES

### Backend: Automatic Provider Matching Function

```typescript
// services/deliveryMatching.service.ts

interface DeliveryRequirements {
  orderId: string;
  totalWeight: number; // tonnes
  totalVolume: number; // cubic meters
  itemCount: number;
  pickupLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  preferredDate: Date;
  specialRequirements?: string[];
}

export class DeliveryMatchingService {
  
  /**
   * Main function: Find and notify delivery providers
   */
  async findAndNotifyProviders(requirements: DeliveryRequirements) {
    try {
      // Step 1: Calculate vehicle requirements
      const vehicleType = this.determineVehicleType(requirements.totalWeight);
      
      // Step 2: Search for providers
      const providers = await this.searchProviders({
        pickupLocation: requirements.pickupLocation,
        vehicleCapacity: requirements.totalWeight,
        vehicleType,
        maxDistance: 20, // km
        availableDate: requirements.preferredDate,
        limit: 5
      });
      
      if (providers.length === 0) {
        // No providers found - expand search
        return await this.expandSearch(requirements);
      }
      
      // Step 3: Create delivery request
      const deliveryRequest = await this.createDeliveryRequest(requirements);
      
      // Step 4: Calculate pricing for each provider
      const providersWithPricing = await Promise.all(
        providers.map(async (provider) => ({
          ...provider,
          estimatedCost: await this.calculateDeliveryCost({
            distance: provider.distance,
            weight: requirements.totalWeight,
            vehicleType: provider.vehicle.type
          })
        }))
      );
      
      // Step 5: Send notifications to all providers simultaneously
      await this.notifyProviders(deliveryRequest.id, providersWithPricing);
      
      // Step 6: Set timeout for responses
      await this.setResponseTimeout(deliveryRequest.id, 5); // 5 minutes
      
      return {
        success: true,
        deliveryRequestId: deliveryRequest.id,
        providersNotified: providers.length,
        estimatedCost: providersWithPricing[0]?.estimatedCost
      };
      
    } catch (error) {
      console.error('Error in delivery matching:', error);
      throw error;
    }
  }
  
  /**
   * Determine required vehicle type based on weight
   */
  private determineVehicleType(weight: number): string {
    if (weight < 2) return 'PICKUP';
    if (weight < 10) return 'SMALL_TRUCK';
    if (weight < 20) return 'LARGE_TRUCK';
    return 'TRAILER';
  }
  
  /**
   * Search for available providers near supplier
   */
  private async searchProviders(params: {
    pickupLocation: { lat: number; lng: number };
    vehicleCapacity: number;
    vehicleType: string;
    maxDistance: number;
    availableDate: Date;
    limit: number;
  }) {
    const { data, error } = await supabase.rpc('find_nearby_providers', {
      p_lat: params.pickupLocation.lat,
      p_lng: params.pickupLocation.lng,
      p_max_distance: params.maxDistance * 1000, // Convert to meters
      p_min_capacity: params.vehicleCapacity,
      p_vehicle_type: params.vehicleType,
      p_date: params.availableDate,
      p_limit: params.limit
    });
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Create delivery request record
   */
  private async createDeliveryRequest(requirements: DeliveryRequirements) {
    const { data, error } = await supabase
      .from('delivery_requests')
      .insert({
        order_id: requirements.orderId,
        total_weight: requirements.totalWeight,
        total_volume: requirements.totalVolume,
        item_count: requirements.itemCount,
        pickup_location: `POINT(${requirements.pickupLocation.lng} ${requirements.pickupLocation.lat})`,
        delivery_location: `POINT(${requirements.deliveryLocation.lng} ${requirements.deliveryLocation.lat})`,
        preferred_date: requirements.preferredDate,
        status: 'MATCHING',
        response_deadline: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Send notifications to all providers
   */
  private async notifyProviders(
    requestId: string,
    providers: any[]
  ) {
    const notifications = providers.map(provider => ({
      delivery_request_id: requestId,
      provider_id: provider.id,
      notification_type: 'NEW_REQUEST',
      delivery_method: 'PUSH',
      shown_details: {
        estimatedCost: provider.estimatedCost,
        distance: provider.distance,
        vehicleType: provider.vehicle.type
      }
    }));
    
    // Save notification records
    await supabase
      .from('delivery_notifications')
      .insert(notifications);
    
    // Send push notifications
    await Promise.all(
      providers.map(provider =>
        this.sendPushNotification(provider, requestId)
      )
    );
    
    // Send SMS backup
    await Promise.all(
      providers.map(provider =>
        this.sendSMSNotification(provider, requestId)
      )
    );
  }
  
  /**
   * Calculate delivery cost
   */
  private async calculateDeliveryCost(params: {
    distance: number;
    weight: number;
    vehicleType: string;
  }) {
    const BASE_RATES = {
      PICKUP: 20, // KES per km
      SMALL_TRUCK: 35,
      LARGE_TRUCK: 50,
      TRAILER: 75
    };
    
    const baseRate = BASE_RATES[params.vehicleType] || 35;
    const distanceCost = params.distance * baseRate;
    
    // Weight surcharge
    let weightSurcharge = 0;
    if (params.weight > 5) {
      weightSurcharge = (params.weight - 5) * 200; // KES 200 per tonne over 5t
    }
    
    // Minimum charge
    const minimumCharge = 2000;
    
    const total = Math.max(distanceCost + weightSurcharge, minimumCharge);
    
    return Math.round(total);
  }
  
  /**
   * Handle provider acceptance
   */
  async handleProviderAcceptance(
    requestId: string,
    providerId: string,
    vehicleId: string
  ) {
    try {
      // Check if already assigned
      const { data: request } = await supabase
        .from('delivery_requests')
        .select('status, assigned_provider_id')
        .eq('id', requestId)
        .single();
      
      if (request?.status === 'ASSIGNED') {
        return {
          success: false,
          message: 'This delivery has already been assigned to another provider'
        };
      }
      
      // Assign the job
      const { data: assignment, error } = await supabase
        .from('delivery_assignments')
        .insert({
          delivery_request_id: requestId,
          provider_id: providerId,
          vehicle_id: vehicleId,
          status: 'ASSIGNED'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update request status
      await supabase
        .from('delivery_requests')
        .update({
          status: 'ASSIGNED',
          assigned_provider_id: providerId,
          assigned_at: new Date()
        })
        .eq('id', requestId);
      
      // Notify other providers that job is filled
      await this.notifyJobFilled(requestId, providerId);
      
      // Notify builder
      await this.notifyBuilderAssigned(requestId, providerId);
      
      // Notify supplier
      await this.notifySupplierAssigned(requestId, providerId);
      
      return {
        success: true,
        assignmentId: assignment.id,
        message: 'Job successfully assigned'
      };
      
    } catch (error) {
      console.error('Error handling acceptance:', error);
      throw error;
    }
  }
}
```

### Database Function: Find Nearby Providers

```sql
-- PostgreSQL function to find nearby providers with available vehicles
CREATE OR REPLACE FUNCTION find_nearby_providers(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_max_distance INTEGER, -- meters
  p_min_capacity DECIMAL,
  p_vehicle_type VARCHAR,
  p_date DATE,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  provider_id UUID,
  provider_name VARCHAR,
  provider_rating DECIMAL,
  provider_phone VARCHAR,
  vehicle_id UUID,
  vehicle_reg VARCHAR,
  vehicle_capacity DECIMAL,
  vehicle_type VARCHAR,
  distance DOUBLE PRECISION,
  base_location POINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id as provider_id,
    dp.company_name as provider_name,
    dp.rating as provider_rating,
    dp.phone as provider_phone,
    dv.id as vehicle_id,
    dv.registration_number as vehicle_reg,
    dv.weight_capacity as vehicle_capacity,
    dv.vehicle_type as vehicle_type,
    ST_Distance(
      dp.base_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance,
    dp.base_location
  FROM delivery_providers dp
  INNER JOIN delivery_vehicles dv ON dp.id = dv.provider_id
  WHERE 
    dp.is_active = true
    AND dp.is_available = true
    AND dp.is_verified = true
    AND dv.is_active = true
    AND dv.is_available = true
    AND dv.weight_capacity >= p_min_capacity
    AND (p_vehicle_type IS NULL OR dv.vehicle_type = p_vehicle_type)
    AND ST_Distance(
      dp.base_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) <= p_max_distance
    -- Check if provider is available on the requested date
    AND NOT EXISTS (
      SELECT 1 FROM delivery_assignments da
      WHERE da.provider_id = dp.id
        AND da.status IN ('ASSIGNED', 'IN_PROGRESS')
        AND da.scheduled_pickup_date = p_date
    )
  ORDER BY 
    distance ASC,
    dp.rating DESC,
    dp.completion_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 📱 MOBILE PUSH NOTIFICATIONS

### Push Notification Payload (Firebase Cloud Messaging)

```json
{
  "notification": {
    "title": "🔔 New Delivery Request",
    "body": "Order PO-2024-156 | 7.5t | 15km | KES 5,500",
    "sound": "urgent_delivery.mp3",
    "badge": "1",
    "priority": "high"
  },
  "data": {
    "type": "NEW_DELIVERY_REQUEST",
    "delivery_request_id": "req_123",
    "order_id": "PO-2024-156",
    "weight": "7.5",
    "distance": "15",
    "estimated_cost": "5500",
    "response_deadline": "2024-11-20T10:20:00Z",
    "pickup_lat": "-1.3167",
    "pickup_lng": "36.8833",
    "delivery_lat": "-1.2921",
    "delivery_lng": "36.8219"
  },
  "android": {
    "priority": "high",
    "ttl": "300s",
    "notification": {
      "channel_id": "delivery_requests",
      "click_action": "OPEN_DELIVERY_REQUEST",
      "color": "#FF6B00"
    }
  },
  "apns": {
    "headers": {
      "apns-priority": "10",
      "apns-expiration": "300"
    },
    "payload": {
      "aps": {
        "sound": "urgent_delivery.caf",
        "badge": 1,
        "category": "DELIVERY_REQUEST"
      }
    }
  }
}
```

---

## 🚀 DEPLOYMENT TO VERCEL

This system requires:
1. Frontend updates (React components)
2. Database migrations (SQL schema)
3. Backend functions (API endpoints)
4. Real-time subscriptions (Supabase realtime)

The workflow documentation has been created. The implementation code and database schema are ready to be integrated into your MradiPro codebase.

---

**MradiPro Delivery Matching** - *Smart. Fast. Automated.* 🚚✨

