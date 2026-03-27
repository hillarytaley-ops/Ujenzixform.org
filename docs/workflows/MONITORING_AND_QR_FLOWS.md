# 📹 UjenziXform Monitoring & QR Code Workflows

## Overview

This document details the construction site monitoring and QR code verification workflows in the UjenziXform platform.

---

## 1. Site Monitoring Service

### 1.1 Monitoring Service Request

```
┌─────────────────────────────────────────────────────────────────┐
│              MONITORING SERVICE REQUEST FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: INITIATE REQUEST                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Builder visits /monitoring                             │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  Clicks "Request Monitoring Service"                    │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  MonitoringServiceRequest form opens                    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 2: FILL REQUEST FORM                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📋 MONITORING SERVICE REQUEST                          │    │
│  │                                                         │    │
│  │  PROJECT DETAILS:                                       │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Project Name: [Greenfield Apartments          ]  │ │    │
│  │  │ Project Type: [Commercial Construction      ▼]   │ │    │
│  │  │ Site Address: [Plot 123, Westlands Road       ]  │ │    │
│  │  │ County:       [Nairobi                      ▼]   │ │    │
│  │  │ GPS Coords:   [-1.2641, 36.8034] [📍 Get Location]│ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  MONITORING TYPE:                                       │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ □ Fixed Cameras                                   │ │    │
│  │  │   • Permanent installation                        │ │    │
│  │  │   • 24/7 recording                                │ │    │
│  │  │   • Weather-resistant                             │ │    │
│  │  │                                                   │ │    │
│  │  │ □ Drone Surveillance                              │ │    │
│  │  │   • Aerial coverage                               │ │    │
│  │  │   • Scheduled flights                             │ │    │
│  │  │   • Progress documentation                        │ │    │
│  │  │                                                   │ │    │
│  │  │ □ Both (Recommended for large sites)              │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  COVERAGE REQUIREMENTS:                                 │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Number of cameras needed: [4        ]             │ │    │
│  │  │ Areas to monitor:                                 │ │    │
│  │  │ □ Main entrance                                   │ │    │
│  │  │ □ Material storage area                           │ │    │
│  │  │ □ Active construction zones                       │ │    │
│  │  │ □ Perimeter                                       │ │    │
│  │  │ □ Other: [                              ]         │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  DURATION:                                              │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Start Date: [Dec 15, 2025            📅]          │ │    │
│  │  │ End Date:   [Jun 15, 2026            📅]          │ │    │
│  │  │ Duration:   6 months                              │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  SPECIAL REQUIREMENTS:                                  │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ [Night vision required for 24/7 monitoring.      ]│ │    │
│  │  │ [Need to cover both Phase 1 and Phase 2 areas.   ]│ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  [Cancel]                        [Submit Request →]     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 3: ADMIN REVIEW                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Admin receives request notification                    │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  Reviews request details                                │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  Site assessment (if needed)                            │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  Prepares quote                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 4: QUOTE & APPROVAL                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  MONITORING SERVICE QUOTE                               │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  Request ID: MON-2025-001234                            │    │
│  │  Project: Greenfield Apartments                         │    │
│  │                                                         │    │
│  │  EQUIPMENT:                                             │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Item                    │ Qty │ Monthly │ Total   │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ HD Camera (Night Vision)│  4  │ 5,000   │ 120,000 │ │    │
│  │  │ Drone Service (Weekly)  │  1  │ 15,000  │ 90,000  │ │    │
│  │  │ Cloud Storage (1TB)     │  1  │ 3,000   │ 18,000  │ │    │
│  │  │ Installation            │  1  │ -       │ 25,000  │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  TOTAL (6 months): KES 253,000                          │    │
│  │                                                         │    │
│  │  [Decline]  [Request Changes]  [Accept & Pay →]         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 5: INSTALLATION                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  • Payment confirmed                                    │    │
│  │  • Installation scheduled                               │    │
│  │  • Equipment deployed                                   │    │
│  │  • System tested                                        │    │
│  │  • Access credentials provided                          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 6: MONITORING ACTIVE                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Builder can now:                                       │    │
│  │  • View live camera feeds                               │    │
│  │  • Access recorded footage                              │    │
│  │  • View drone captures                                  │    │
│  │  • Download progress reports                            │    │
│  │                                                         │    │
│  │  NOTE: Builder has VIEW-ONLY access                     │    │
│  │  Camera controls are ADMIN-ONLY                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Live Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                LIVE MONITORING DASHBOARD                         │
│                    (/monitoring)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🏗️ Greenfield Apartments - Live Monitoring             │    │
│  │  Status: 🟢 All Systems Online                          │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  CAMERA FEEDS:                                          │    │
│  │  ┌─────────────────┐ ┌─────────────────┐                │    │
│  │  │ 📹 Camera 1     │ │ 📹 Camera 2     │                │    │
│  │  │ Main Entrance   │ │ Storage Area    │                │    │
│  │  │ ┌─────────────┐ │ │ ┌─────────────┐ │                │    │
│  │  │ │             │ │ │ │             │ │                │    │
│  │  │ │  [LIVE]     │ │ │ │  [LIVE]     │ │                │    │
│  │  │ │             │ │ │ │             │ │                │    │
│  │  │ └─────────────┘ │ │ └─────────────┘ │                │    │
│  │  │ 🔴 Recording    │ │ 🔴 Recording    │                │    │
│  │  │ [Fullscreen]    │ │ [Fullscreen]    │                │    │
│  │  └─────────────────┘ └─────────────────┘                │    │
│  │                                                         │    │
│  │  ┌─────────────────┐ ┌─────────────────┐                │    │
│  │  │ 📹 Camera 3     │ │ 📹 Camera 4     │                │    │
│  │  │ Construction    │ │ Perimeter       │                │    │
│  │  │ Zone A          │ │ North           │                │    │
│  │  │ ┌─────────────┐ │ │ ┌─────────────┐ │                │    │
│  │  │ │             │ │ │ │             │ │                │    │
│  │  │ │  [LIVE]     │ │ │ │  [LIVE]     │ │                │    │
│  │  │ │             │ │ │ │             │ │                │    │
│  │  │ └─────────────┘ │ │ └─────────────┘ │                │    │
│  │  │ 🔴 Recording    │ │ 🔴 Recording    │                │    │
│  │  │ [Fullscreen]    │ │ [Fullscreen]    │                │    │
│  │  └─────────────────┘ └─────────────────┘                │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  DRONE CAPTURES:                                        │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Latest: Dec 2, 2025 (2 days ago)                │   │    │
│  │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │    │
│  │  │ │  📷 1   │ │  📷 2   │ │  📷 3   │ │  📷 4   │ │   │    │
│  │  │ │ Aerial  │ │ North   │ │ South   │ │ Overview│ │   │    │
│  │  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │    │
│  │  │ [View All Drone Captures]                       │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  QUICK STATS:                                           │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ Uptime  │ │ Storage │ │ Events  │ │ Next    │       │    │
│  │  │ 99.8%   │ │ 234 GB  │ │ 12 Today│ │ Drone   │       │    │
│  │  │         │ │ Used    │ │         │ │ Dec 9   │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  │                                                         │    │
│  │  [Download Report]  [View History]  [Support]           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Access Control Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                MONITORING ACCESS CONTROL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FEATURE                    │ ADMIN │ BUILDER │ SUPPLIER │ OTHER│
│  ───────────────────────────┼───────┼─────────┼──────────┼──────│
│  View live camera feeds     │  ✅   │   ✅    │    ❌    │  ❌  │
│  Control cameras (PTZ)      │  ✅   │   ❌    │    ❌    │  ❌  │
│  Start/stop recording       │  ✅   │   ❌    │    ❌    │  ❌  │
│  Access recorded footage    │  ✅   │   ✅*   │    ❌    │  ❌  │
│  Download footage           │  ✅   │   ✅*   │    ❌    │  ❌  │
│  Control drone flights      │  ✅   │   ❌    │    ❌    │  ❌  │
│  View drone captures        │  ✅   │   ✅    │    ❌    │  ❌  │
│  Configure alerts           │  ✅   │   ❌    │    ❌    │  ❌  │
│  Manage camera settings     │  ✅   │   ❌    │    ❌    │  ❌  │
│  View all projects          │  ✅   │   ❌    │    ❌    │  ❌  │
│                                                                 │
│  * Builder access limited to their assigned projects only       │
│                                                                 │
│  SECURITY RATIONALE:                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Builders have VIEW-ONLY access because:                │    │
│  │                                                         │    │
│  │  1. SECURITY: Prevents unauthorized camera manipulation │    │
│  │  2. INTEGRITY: Ensures footage authenticity             │    │
│  │  3. LIABILITY: Clear chain of custody for evidence      │    │
│  │  4. PRIVACY: Controlled access to sensitive footage     │    │
│  │                                                         │    │
│  │  If a builder needs specific footage:                   │    │
│  │  • Request via support ticket                           │    │
│  │  • Admin reviews and approves                           │    │
│  │  • Footage provided with audit trail                    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. QR Code System

### 2.1 QR Code Generation (Automatic on Order)

```
┌─────────────────────────────────────────────────────────────────┐
│                   QR CODE GENERATION                             │
│            (Automatic - Triggered by Order Placement)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚡ TRIGGER: Order placed by Builder/Client                     │
│  ─────────────────────────────────────────────────────────────  │
│  QR codes are generated IMMEDIATELY when:                       │
│  • Professional Builder places an order                         │
│  • Private Client buys items directly from supplier             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ORDER PLACED                                           │    │
│  │      │                                                  │    │
│  │      ▼                                                  │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │         SYSTEM AUTO-GENERATES QR CODES          │   │    │
│  │  │                                                 │   │    │
│  │  │  • One QR code per line item                    │   │    │
│  │  │  • Unique identifier for each product           │   │    │
│  │  │  • Linked to order and customer                 │   │    │
│  │  │  • Cryptographically signed                     │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │      │                                                  │    │
│  │      ▼                                                  │    │
│  │  SUPPLIER NOTIFIED                                      │    │
│  │  "New order received - QR codes ready for download"     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 1: SUPPLIER DOWNLOADS QR CODES (MANDATORY)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ⚠️ SUPPLIER MUST:                                      │    │
│  │  1. Download QR codes from order dashboard              │    │
│  │  2. Print QR labels                                     │    │
│  │  3. Attach to MATCHING items purchased by client        │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │  📋 ORDER: PO-2025-001234                       │   │    │
│  │  │  Customer: John Kamau Construction              │   │    │
│  │  │                                                 │   │    │
│  │  │  QR CODES READY:                                │   │    │
│  │  │  ┌─────────────────────────────────────────┐   │   │    │
│  │  │  │ Item              │ QR Code │ Action    │   │   │    │
│  │  │  ├─────────────────────────────────────────┤   │   │    │
│  │  │  │ Bamburi Cement    │ ✅ Ready │ [Download]│   │   │    │
│  │  │  │ Y12 Rebar         │ ✅ Ready │ [Download]│   │   │    │
│  │  │  │ River Sand        │ ✅ Ready │ [Download]│   │   │    │
│  │  │  └─────────────────────────────────────────┘   │   │    │
│  │  │                                                 │   │    │
│  │  │  [Download All QR Codes]  [Print All]           │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 2: PRINT & ATTACH TO MATCHING ITEMS                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📋 QR CODE GENERATOR                                   │    │
│  │                                                         │    │
│  │  Order: PO-2025-001234                                  │    │
│  │  Customer: John Kamau Construction                      │    │
│  │                                                         │    │
│  │  ITEMS TO LABEL:                                        │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Product          │ Qty │ QR Status │ Action      │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ Bamburi Cement   │ 100 │ ✅ Generated│ [Print]    │ │    │
│  │  │ Y12 Rebar        │ 50  │ ✅ Generated│ [Print]    │ │    │
│  │  │ River Sand       │ 10  │ ⏳ Pending  │ [Generate] │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  [Generate All]  [Print All]  [Download PDF]            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 3: QR CODE DATA STRUCTURE                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Each QR code contains:                                 │    │
│  │                                                         │    │
│  │  {                                                      │    │
│  │    "id": "QR-2025-001234-001",                          │    │
│  │    "order_id": "PO-2025-001234",                        │    │
│  │    "product": {                                         │    │
│  │      "name": "Bamburi Cement 50kg",                     │    │
│  │      "sku": "BC-50KG-001",                              │    │
│  │      "batch": "B2025-1203-A"                            │    │
│  │    },                                                   │    │
│  │    "quantity": 100,                                     │    │
│  │    "unit": "bags",                                      │    │
│  │    "supplier": {                                        │    │
│  │      "id": "SUP-001",                                   │    │
│  │      "name": "ABC Hardware Ltd"                         │    │
│  │    },                                                   │    │
│  │    "generated_at": "2025-12-03T10:30:00Z",              │    │
│  │    "expires_at": "2025-12-10T10:30:00Z",                │    │
│  │    "signature": "a1b2c3d4e5f6..."                       │    │
│  │  }                                                      │    │
│  │                                                         │    │
│  │  The signature is a cryptographic hash that:            │    │
│  │  • Prevents tampering                                   │    │
│  │  • Verifies authenticity                                │    │
│  │  • Links to blockchain record (optional)                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  STEP 4: PRINT & ATTACH                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  QR LABEL FORMAT:                                       │    │
│  │  ┌───────────────────────────────────────┐             │    │
│  │  │                                       │             │    │
│  │  │  🏗️ UjenziXform Verified               │             │    │
│  │  │                                       │             │    │
│  │  │  ┌─────────────┐  Bamburi Cement     │             │    │
│  │  │  │ █▀▀▀▀▀█ ▄▄ │  50kg Bags          │             │    │
│  │  │  │ █ ▄▄▄ █ ▀▀ │                      │             │    │
│  │  │  │ █▄▄▄▄▄█    │  Qty: 100 bags      │             │    │
│  │  │  └─────────────┘  Batch: B2025-1203  │             │    │
│  │  │                                       │             │    │
│  │  │  Order: PO-2025-001234               │             │    │
│  │  │  Scan to verify authenticity         │             │    │
│  │  │                                       │             │    │
│  │  └───────────────────────────────────────┘             │    │
│  │                                                         │    │
│  │  • Labels printed on weather-resistant paper            │    │
│  │  • Attached to each pallet/bundle                       │    │
│  │  • Multiple labels for large quantities                 │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 QR Scanning Workflow (Updated Process)

```
┌─────────────────────────────────────────────────────────────────┐
│                   QR SCANNING WORKFLOW                           │
│                      (/scanners)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ IMPORTANT: ONLY 2 SCANNING POINTS - NO TRANSIT SCANNING    │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  SCANNING POINTS:                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📦 DISPATCH SCAN (Supplier - MANDATORY)                │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │     When: Loading materials into delivery vehicle       │    │
│  │     Who: SUPPLIER staff                                 │    │
│  │     Purpose:                                            │    │
│  │     • Confirm all items being loaded                    │    │
│  │     • Verify quantities match order                     │    │
│  │     • Record dispatch timestamp                         │    │
│  │     • Create chain of custody                           │    │
│  │                                                         │    │
│  │  ❌ NO SCANNING DURING TRANSIT                          │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │     Driver does NOT scan during transport               │    │
│  │     Only GPS tracking is active                         │    │
│  │                                                         │    │
│  │  ✅ DELIVERY SCAN (Driver - MANDATORY)                  │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │     When: AFTER offloading at delivery site             │    │
│  │     Who: DELIVERY PROVIDER (Driver)                     │    │
│  │     Purpose:                                            │    │
│  │     • Scan ALL delivered materials                      │    │
│  │     • Report any damages with PHOTOS                    │    │
│  │     • Upload photos of ALL items after offload          │    │
│  │     • Confirm delivery completion                       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  SCANNING PROCESS:                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  1. Open Scanner App                                    │    │
│  │     ┌─────────────────────────────────────────────┐    │    │
│  │     │                                             │    │    │
│  │     │  📷 UJENZIXFORM QR SCANNER                     │    │    │
│  │     │                                             │    │    │
│  │     │  ┌───────────────────────────────────────┐ │    │    │
│  │     │  │                                       │ │    │    │
│  │     │  │         [Camera Viewfinder]           │ │    │    │
│  │     │  │                                       │ │    │    │
│  │     │  │      ╔═══════════════════╗           │ │    │    │
│  │     │  │      ║   Scan QR Code    ║           │ │    │    │
│  │     │  │      ╚═══════════════════╝           │ │    │    │
│  │     │  │                                       │ │    │    │
│  │     │  └───────────────────────────────────────┘ │    │    │
│  │     │                                             │    │    │
│  │     │  Mode: [Receiving ▼]                        │    │    │
│  │     │                                             │    │    │
│  │     └─────────────────────────────────────────────┘    │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  2. Scan QR Code                                        │    │
│  │     • Point camera at QR label                          │    │
│  │     • Auto-detect and decode                            │    │
│  │     • Verify signature                                  │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  3. View Scan Result                                    │    │
│  │     ┌─────────────────────────────────────────────┐    │    │
│  │     │                                             │    │    │
│  │     │  ✅ VERIFIED                                │    │    │
│  │     │                                             │    │    │
│  │     │  Product: Bamburi Cement 50kg               │    │    │
│  │     │  Quantity: 100 bags                         │    │    │
│  │     │  Batch: B2025-1203-A                        │    │    │
│  │     │                                             │    │    │
│  │     │  Order: PO-2025-001234                      │    │    │
│  │     │  Supplier: ABC Hardware Ltd                 │    │    │
│  │     │                                             │    │    │
│  │     │  Chain of Custody:                          │    │    │
│  │     │  ✓ Generated: Dec 3, 10:30 AM               │    │    │
│  │     │  ✓ Dispatched: Dec 5, 8:15 AM               │    │    │
│  │     │  ✓ Picked up: Dec 5, 8:45 AM                │    │    │
│  │     │  ● Receiving: Now                           │    │    │
│  │     │                                             │    │    │
│  │     │  [Confirm Receipt]  [Report Issue]          │    │    │
│  │     │                                             │    │    │
│  │     └─────────────────────────────────────────────┘    │    │
│  │                          │                              │    │
│  │                          ▼                              │    │
│  │  4. Confirm or Report                                   │    │
│  │     • Confirm: Item added to received list              │    │
│  │     • Report: Issue logged with photo evidence          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 QR Verification States

```
┌─────────────────────────────────────────────────────────────────┐
│                   QR VERIFICATION STATES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ VERIFIED                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Signature valid                                       │    │
│  │ • QR code not expired                                   │    │
│  │ • Order exists in system                                │    │
│  │ • Product matches order                                 │    │
│  │ • Not previously scanned (for receiving)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⚠️ WARNING                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • QR code near expiry                                   │    │
│  │ • Already scanned at previous checkpoint                │    │
│  │ • Minor data mismatch (proceed with caution)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ❌ INVALID                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Signature invalid (possible counterfeit)              │    │
│  │ • QR code expired                                       │    │
│  │ • Order not found                                       │    │
│  │ • Product doesn't match order                           │    │
│  │ • Duplicate scan detected                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  🔄 OFFLINE MODE                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Scan stored locally                                   │    │
│  │ • Basic signature verification                          │    │
│  │ • Full verification when online                         │    │
│  │ • Sync pending indicator shown                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Complete QR Workflow (Step-by-Step)

```
┌─────────────────────────────────────────────────────────────────┐
│              COMPLETE QR WORKFLOW - STEP BY STEP                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 1: ORDER & QR GENERATION (AUTOMATIC)                     │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  👷 BUILDER/CLIENT PLACES ORDER                         │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  • Professional Builder places order through platform   │    │
│  │           OR                                            │    │
│  │  • Private Client buys directly from supplier           │    │
│  │                                                         │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │                                                         │    │
│  │  ⚡ SYSTEM AUTO-GENERATES QR CODES (IMMEDIATE)          │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  • QR codes generated for EACH line item                │    │
│  │  • Linked to order, customer, and supplier              │    │
│  │  • Cryptographically signed                             │    │
│  │  • Stored in database                                   │    │
│  │                                                         │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │                                                         │    │
│  │  📧 SUPPLIER NOTIFIED                                   │    │
│  │  "New order PO-2025-001234 - QR codes ready"            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 2: SUPPLIER PREPARES ORDER (MANDATORY STEPS)             │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📥 STEP 1: SUPPLIER DOWNLOADS QR CODES                 │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  ⚠️ MANDATORY: Supplier MUST download QR codes          │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │  📋 Order Dashboard                             │   │    │
│  │  │                                                 │   │    │
│  │  │  Order: PO-2025-001234                          │   │    │
│  │  │  Status: QR Codes Ready                         │   │    │
│  │  │                                                 │   │    │
│  │  │  [Download All QR Codes] [Download as PDF]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │                                                         │    │
│  │  🖨️ STEP 2: SUPPLIER PRINTS QR LABELS                  │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  • Print on weather-resistant labels                    │    │
│  │  • One label per product type/batch                     │    │
│  │  • Clear and scannable                                  │    │
│  │                                                         │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │                                                         │    │
│  │  🏷️ STEP 3: SUPPLIER ATTACHES TO MATCHING ITEMS        │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  ⚠️ CRITICAL: QR must match the EXACT items ordered     │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │  QR Code: QR-001 → Attach to Cement Pallet      │   │    │
│  │  │  QR Code: QR-002 → Attach to Rebar Bundle       │   │    │
│  │  │  QR Code: QR-003 → Attach to Sand Load          │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 3: DISPATCH SCANNING (SUPPLIER - MANDATORY)              │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📦 SUPPLIER SCANS ALL ITEMS DURING LOADING             │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  ⚠️ MANDATORY: Supplier MUST scan each item as it's     │    │
│  │                loaded into the delivery vehicle         │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │                                                 │   │    │
│  │  │  📱 DISPATCH SCANNER                            │   │    │
│  │  │                                                 │   │    │
│  │  │  Order: PO-2025-001234                          │   │    │
│  │  │  Vehicle: KCB 123A                              │   │    │
│  │  │  Driver: James Ochieng                          │   │    │
│  │  │                                                 │   │    │
│  │  │  SCAN PROGRESS:                                 │   │    │
│  │  │  ┌───────────────────────────────────────────┐ │   │    │
│  │  │  │ Item              │ Expected │ Scanned   │ │   │    │
│  │  │  ├───────────────────────────────────────────┤ │   │    │
│  │  │  │ Bamburi Cement    │   100    │ ✅ 100    │ │   │    │
│  │  │  │ Y12 Rebar         │    50    │ ✅ 50     │ │   │    │
│  │  │  │ River Sand        │    10    │ ⏳ 0      │ │   │    │
│  │  │  └───────────────────────────────────────────┘ │   │    │
│  │  │                                                 │   │    │
│  │  │  [Scan Next Item]                               │   │    │
│  │  │                                                 │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  On completion:                                         │    │
│  │  • All items verified as loaded                         │    │
│  │  • Dispatch timestamp recorded                          │    │
│  │  • Driver receives handover confirmation                │    │
│  │  • Order status: "Dispatched"                           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 4: TRANSIT (NO SCANNING)                                 │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🚚 IN TRANSIT - GPS TRACKING ONLY                      │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  ❌ NO SCANNING REQUIRED DURING TRANSIT                 │    │
│  │                                                         │    │
│  │  Active monitoring:                                     │    │
│  │  • GPS location tracking                                │    │
│  │  • Route monitoring                                     │    │
│  │  • ETA updates                                          │    │
│  │  • Real-time status for builder                         │    │
│  │                                                         │    │
│  │  Driver focuses on:                                     │    │
│  │  • Safe transportation                                  │    │
│  │  • Route navigation                                     │    │
│  │  • Material protection                                  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 5: DELIVERY SCANNING (DRIVER - MANDATORY)                │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ✅ DRIVER SCANS ALL ITEMS AFTER OFFLOADING             │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  ⚠️ MANDATORY: Driver MUST:                             │    │
│  │  1. Offload all materials                               │    │
│  │  2. Scan EVERY item's QR code                           │    │
│  │  3. Report any damages                                  │    │
│  │  4. Take photos of ALL items                            │    │
│  │  5. Take photos of ANY damages                          │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │                                                 │   │    │
│  │  │  📱 DELIVERY SCANNER                            │   │    │
│  │  │                                                 │   │    │
│  │  │  Order: PO-2025-001234                          │   │    │
│  │  │  Site: Greenfield Apartments, Westlands         │   │    │
│  │  │                                                 │   │    │
│  │  │  DELIVERY VERIFICATION:                         │   │    │
│  │  │  ┌───────────────────────────────────────────┐ │   │    │
│  │  │  │ Item           │ Status   │ Condition    │ │   │    │
│  │  │  ├───────────────────────────────────────────┤ │   │    │
│  │  │  │ Bamburi Cement │ ✅ Scanned│ ✅ Good      │ │   │    │
│  │  │  │ Y12 Rebar      │ ✅ Scanned│ ⚠️ 2 Damaged│ │   │    │
│  │  │  │ River Sand     │ ✅ Scanned│ ✅ Good      │ │   │    │
│  │  │  └───────────────────────────────────────────┘ │   │    │
│  │  │                                                 │   │    │
│  │  │  [Scan Next] [Report Damage] [Take Photo]       │   │    │
│  │  │                                                 │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 6: PHOTO DOCUMENTATION (DRIVER - MANDATORY)              │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📸 MANDATORY PHOTO UPLOADS                             │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  Driver MUST upload photos:                             │    │
│  │                                                         │    │
│  │  1. PHOTOS OF ALL DELIVERED ITEMS (Required)            │    │
│  │     ┌─────────────────────────────────────────────┐    │    │
│  │     │  📷 Photo 1: Cement bags - offloaded        │    │    │
│  │     │  📷 Photo 2: Rebar bundles - offloaded      │    │    │
│  │     │  📷 Photo 3: Sand pile - offloaded          │    │    │
│  │     │  📷 Photo 4: Overview of all materials      │    │    │
│  │     └─────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  2. PHOTOS OF ANY DAMAGES (If applicable)               │    │
│  │     ┌─────────────────────────────────────────────┐    │    │
│  │     │  📷 Damage 1: Bent rebar (2 pieces)         │    │    │
│  │     │  📷 Damage 2: Close-up of damage            │    │    │
│  │     └─────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │                                                 │   │    │
│  │  │  📱 PHOTO UPLOAD SCREEN                         │   │    │
│  │  │                                                 │   │    │
│  │  │  Order: PO-2025-001234                          │   │    │
│  │  │                                                 │   │    │
│  │  │  REQUIRED PHOTOS:                               │   │    │
│  │  │  ┌─────────────────────────────────────────┐   │   │    │
│  │  │  │ ✅ All items photo (1/1)                │   │   │    │
│  │  │  │ ✅ Cement photo (1/1)                   │   │   │    │
│  │  │  │ ✅ Rebar photo (1/1)                    │   │   │    │
│  │  │  │ ✅ Sand photo (1/1)                     │   │   │    │
│  │  │  └─────────────────────────────────────────┘   │   │    │
│  │  │                                                 │   │    │
│  │  │  DAMAGE PHOTOS (2 items damaged):               │   │    │
│  │  │  ┌─────────────────────────────────────────┐   │   │    │
│  │  │  │ ✅ Damage photo 1 (bent rebar)          │   │   │    │
│  │  │  │ ✅ Damage photo 2 (close-up)            │   │   │    │
│  │  │  └─────────────────────────────────────────┘   │   │    │
│  │  │                                                 │   │    │
│  │  │  [Add More Photos]  [Complete Delivery →]       │   │    │
│  │  │                                                 │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  PHASE 7: DELIVERY COMPLETION                                   │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ✅ DELIVERY CONFIRMED                                  │    │
│  │  ───────────────────────────────────────────────────── │    │
│  │                                                         │    │
│  │  When driver completes all steps:                       │    │
│  │                                                         │    │
│  │  1. All items scanned                                   │    │
│  │  2. All photos uploaded                                 │    │
│  │  3. Damages reported (if any)                           │    │
│  │  4. Damage photos uploaded (if any)                     │    │
│  │                                                         │    │
│  │  SYSTEM ACTIONS:                                        │    │
│  │  • GRN (Goods Received Note) auto-generated             │    │
│  │  • Builder notified of delivery                         │    │
│  │  • Supplier notified of completion                      │    │
│  │  • Payment released to driver                           │    │
│  │  • Damage claim initiated (if damages reported)         │    │
│  │                                                         │    │
│  │  BUILDER RECEIVES:                                      │    │
│  │  • Delivery confirmation notification                   │    │
│  │  • Photos of delivered materials                        │    │
│  │  • Damage report (if any)                               │    │
│  │  • Option to accept or dispute                          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Chain of Custody Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                   CHAIN OF CUSTODY SUMMARY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SIMPLIFIED 2-POINT SCANNING SYSTEM:                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📋 ORDER PLACED                                        │    │
│  │  Time: Dec 3, 10:30 AM                                  │    │
│  │  Action: QR codes auto-generated                        │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  📥 SUPPLIER DOWNLOADS QR CODES                         │    │
│  │  Time: Dec 3, 11:00 AM                                  │    │
│  │  Action: Print & attach to items                        │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  📦 SCAN POINT 1: DISPATCH (Supplier)                   │    │
│  │  Time: Dec 5, 8:15 AM                                   │    │
│  │  Who: Supplier staff                                    │    │
│  │  Action: Scan all items during loading                  │    │
│  │  Result: Dispatch confirmed                             │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  🚚 TRANSIT (No scanning)                               │    │
│  │  Time: Dec 5, 8:15 AM - 11:00 AM                        │    │
│  │  Action: GPS tracking only                              │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  ✅ SCAN POINT 2: DELIVERY (Driver)                     │    │
│  │  Time: Dec 5, 11:23 AM                                  │    │
│  │  Who: Delivery driver                                   │    │
│  │  Action:                                                │    │
│  │    • Scan ALL items after offload                       │    │
│  │    • Report damages                                     │    │
│  │    • Upload photos of items                             │    │
│  │    • Upload photos of damages                           │    │
│  │  Result: Delivery confirmed                             │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  📄 GRN GENERATED                                       │    │
│  │  Time: Dec 5, 11:25 AM                                  │    │
│  │  Action: Auto-generated with all scan data              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  AUDIT TRAIL BENEFITS:                                          │
│  • Clear handover points                                        │
│  • Photo evidence of condition                                  │
│  • Damage accountability                                        │
│  • Dispute resolution support                                   │
│  • Insurance claim documentation                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Offline Capabilities

### 3.1 Offline Scanner Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                   OFFLINE SCANNER MODE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHEN OFFLINE:                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  📵 No Internet Connection                              │    │
│  │                                                         │    │
│  │  The scanner continues to work:                         │    │
│  │                                                         │    │
│  │  1. QR codes can still be scanned                       │    │
│  │  2. Basic signature verification (cached keys)          │    │
│  │  3. Scans stored in local database                      │    │
│  │  4. Photos saved locally                                │    │
│  │                                                         │    │
│  │  Limitations:                                           │    │
│  │  • Cannot verify against live database                  │    │
│  │  • Cannot check for duplicates across devices           │    │
│  │  • Real-time notifications disabled                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  SYNC PROCESS:                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  When connection restored:                              │    │
│  │                                                         │    │
│  │  1. Detect connectivity                                 │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  2. Upload pending scans                                │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  3. Verify against server                               │    │
│  │         │                                               │    │
│  │         ├── Valid → Mark as synced                      │    │
│  │         │                                               │    │
│  │         └── Issue → Flag for review                     │    │
│  │                                                         │    │
│  │  4. Download any missed updates                         │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  5. Show sync status                                    │    │
│  │     ┌─────────────────────────────────────────────┐    │    │
│  │     │ ✅ 15 scans synced successfully             │    │    │
│  │     │ ⚠️ 2 scans need review                      │    │    │
│  │     └─────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  HOOKS USED:                                                    │
│  • useOfflineScanner - Offline scanning logic                   │
│  • useOfflineSync - Synchronization management                  │
│  • useRealtimeScannerSync - Real-time sync when online          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Reference

### 4.1 Monitoring Components

| Component | File | Purpose |
|-----------|------|---------|
| `MonitoringServiceRequest` | `src/components/builders/MonitoringServiceRequest.tsx` | Service request form |
| `LiveStreamMonitor` | `src/components/LiveStreamMonitor.tsx` | Live camera feeds |
| `DroneMonitor` | `src/components/DroneMonitor.tsx` | Drone footage viewer |
| `PhysicalCameraViewer` | `src/components/PhysicalCameraViewer.tsx` | Camera feed display |
| `CameraControls` | `src/components/CameraControls.tsx` | PTZ controls (admin) |
| `CameraSetup` | `src/components/CameraSetup.tsx` | Camera configuration |
| `MonitoringRequestsManager` | `src/components/admin/MonitoringRequestsManager.tsx` | Admin request management |

### 4.2 QR Components

| Component | File | Purpose |
|-----------|------|---------|
| `QRScanner` | `src/components/QRScanner.tsx` | Main scanner component |
| `QRCodeManager` | `src/components/QRCodeManager.tsx` | QR generation |
| `QRCodeDisplay` | `src/components/qr/QRCodeDisplay.tsx` | QR code display |
| `QRScanResult` | `src/components/qr/QRScanResult.tsx` | Scan result display |
| `OfflineQRScanner` | `src/components/qr/OfflineQRScanner.tsx` | Offline scanner |

### 4.3 Related Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useSecureCameras` | `src/hooks/useSecureCameras.ts` | Camera access control |
| `useOfflineScanner` | `src/hooks/useOfflineScanner.ts` | Offline scanning |
| `useOfflineSync` | `src/hooks/useOfflineSync.ts` | Data synchronization |
| `useRealtimeScannerSync` | `src/hooks/useRealtimeScannerSync.ts` | Real-time sync |
| `useEnhancedScannerSecurity` | `src/hooks/useEnhancedScannerSecurity.ts` | Scanner security |

---

*Document Version: 2.0*  
*Last Updated: December 3, 2025*

