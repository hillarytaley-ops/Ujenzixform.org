# 💳 UjenziXform Payment & Security Workflows

## Overview

This document details all payment processing workflows and security measures in the UjenziXform platform.

---

## 1. Payment Methods

### 1.1 Supported Payment Options

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT METHODS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MOBILE MONEY (Primary)                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🟢 M-PESA (Safaricom)                                  │    │
│  │     • Most popular in Kenya                             │    │
│  │     • STK Push integration                              │    │
│  │     • Instant confirmation                              │    │
│  │     • Transaction limit: KES 150,000/day                │    │
│  │                                                         │    │
│  │  🔵 AIRTEL MONEY                                        │    │
│  │     • Second largest network                            │    │
│  │     • USSD and app integration                          │    │
│  │     • Transaction limit: KES 100,000/day                │    │
│  │                                                         │    │
│  │  🟠 T-KASH (Telkom)                                     │    │
│  │     • Growing user base                                 │    │
│  │     • Similar integration                               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  BANK TRANSFERS                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🏦 PESALINK                                            │    │
│  │     • Real-time bank transfers                          │    │
│  │     • All major Kenyan banks                            │    │
│  │     • Higher limits available                           │    │
│  │                                                         │    │
│  │  🏦 DIRECT BANK TRANSFER                                │    │
│  │     • For large orders                                  │    │
│  │     • Manual verification                               │    │
│  │     • 24-48 hour processing                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  CARD PAYMENTS                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  💳 VISA / MASTERCARD                                   │    │
│  │     • Debit and credit cards                            │    │
│  │     • 3D Secure enabled                                 │    │
│  │     • International cards accepted                      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. M-Pesa Payment Flow

### 2.1 STK Push Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   M-PESA STK PUSH FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. USER INITIATES PAYMENT                                      │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  💳 Payment Method                                  │     │
│     │                                                     │     │
│     │  ○ M-Pesa  ○ Airtel Money  ○ Card  ○ Bank          │     │
│     │  ●                                                  │     │
│     │                                                     │     │
│     │  📱 M-Pesa Phone Number:                            │     │
│     │  [+254 ] [712 345 678        ]                      │     │
│     │                                                     │     │
│     │  Amount: KES 195,460                                │     │
│     │                                                     │     │
│     │  [Pay Now →]                                        │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  2. SYSTEM VALIDATES                                            │
│     • Phone number format (07XX or +254)                        │
│     • Amount within limits                                      │
│     • User account active                                       │
│                          │                                      │
│                          ▼                                      │
│  3. DARAJA API CALL                                             │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  POST /mpesa/stkpush/v1/processrequest              │     │
│     │                                                     │     │
│     │  {                                                  │     │
│     │    "BusinessShortCode": "174379",                   │     │
│     │    "Password": "<base64_encoded>",                  │     │
│     │    "Timestamp": "20251203112345",                   │     │
│     │    "TransactionType": "CustomerPayBillOnline",      │     │
│     │    "Amount": 195460,                                │     │
│     │    "PartyA": "254712345678",                        │     │
│     │    "PartyB": "174379",                              │     │
│     │    "PhoneNumber": "254712345678",                   │     │
│     │    "CallBackURL": "https://api.ujenzixform.org/...", │     │
│     │    "AccountReference": "PO-2025-001234",            │     │
│     │    "TransactionDesc": "Material Purchase"           │     │
│     │  }                                                  │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  4. STK PUSH SENT TO USER'S PHONE                               │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  ┌─────────────────────────────────────┐           │     │
│     │  │                                     │           │     │
│     │  │  📱 M-PESA                          │           │     │
│     │  │                                     │           │     │
│     │  │  Pay KES 195,460.00 to              │           │     │
│     │  │  UJENZIXFORM LTD                       │           │     │
│     │  │                                     │           │     │
│     │  │  Account: PO-2025-001234            │           │     │
│     │  │                                     │           │     │
│     │  │  Enter M-PESA PIN:                  │           │     │
│     │  │  [• • • •]                          │           │     │
│     │  │                                     │           │     │
│     │  │  [Cancel]           [OK]            │           │     │
│     │  │                                     │           │     │
│     │  └─────────────────────────────────────┘           │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  5. USER ENTERS PIN                                             │
│     • Transaction processed by Safaricom                        │
│     • Takes 5-30 seconds                                        │
│                          │                                      │
│                          ▼                                      │
│  6. CALLBACK RECEIVED                                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │  SUCCESS CALLBACK:                                  │     │
│     │  {                                                  │     │
│     │    "ResultCode": 0,                                 │     │
│     │    "ResultDesc": "Success",                         │     │
│     │    "MpesaReceiptNumber": "QK12AB34CD",              │     │
│     │    "TransactionDate": "20251203112345",             │     │
│     │    "PhoneNumber": "254712345678",                   │     │
│     │    "Amount": 195460                                 │     │
│     │  }                                                  │     │
│     │                                                     │     │
│     │  FAILURE CALLBACK:                                  │     │
│     │  {                                                  │     │
│     │    "ResultCode": 1032,                              │     │
│     │    "ResultDesc": "Request cancelled by user"        │     │
│     │  }                                                  │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                      │
│                          ▼                                      │
│  7. PAYMENT RECORDED                                            │
│     • Transaction saved to database                             │
│     • Order status updated                                      │
│     • Receipt generated                                         │
│     • Email/SMS confirmation sent                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Payment Status Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT STATUS CODES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CODE  │ DESCRIPTION              │ ACTION                      │
│  ──────┼──────────────────────────┼───────────────────────────  │
│  0     │ Success                  │ Confirm order               │
│  1     │ Insufficient balance     │ Notify user, retry option   │
│  1032  │ Cancelled by user        │ Allow retry                 │
│  1037  │ Timeout                  │ Allow retry                 │
│  2001  │ Wrong PIN                │ Allow retry (max 3)         │
│  1001  │ Unable to lock account   │ Try again later             │
│  1019  │ Transaction expired      │ Restart payment             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Escrow Payment System

### 3.1 Escrow Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ESCROW PAYMENT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PURPOSE: Protect both buyer and seller                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  STEP 1: PAYMENT HELD                                   │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  Builder pays → UjenziXform Escrow Account                 │    │
│  │                                                         │    │
│  │  ┌─────────┐         ┌─────────┐         ┌─────────┐   │    │
│  │  │ Builder │ ──KES──▶│ ESCROW  │         │Supplier │   │    │
│  │  │         │         │ ACCOUNT │         │         │   │    │
│  │  └─────────┘         └─────────┘         └─────────┘   │    │
│  │                                                         │    │
│  │  • Supplier notified of secured payment                 │    │
│  │  • Order confirmed                                      │    │
│  │  • Materials prepared                                   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  STEP 2: DELIVERY & VERIFICATION                        │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  • Materials delivered to site                          │    │
│  │  • Builder verifies receipt (GRN)                       │    │
│  │  • QR codes scanned and validated                       │    │
│  │  • Digital signature captured                           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  STEP 3: FUNDS RELEASED                                 │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  Upon successful delivery confirmation:                 │    │
│  │                                                         │    │
│  │  ┌─────────┐         ┌─────────┐         ┌─────────┐   │    │
│  │  │ Builder │         │ ESCROW  │ ──KES──▶│Supplier │   │    │
│  │  │   ✓     │         │ ACCOUNT │         │   ✓     │   │    │
│  │  └─────────┘         └─────────┘         └─────────┘   │    │
│  │                            │                            │    │
│  │                            ▼                            │    │
│  │                      ┌─────────┐                        │    │
│  │                      │Delivery │                        │    │
│  │                      │Provider │                        │    │
│  │                      │   ✓     │                        │    │
│  │                      └─────────┘                        │    │
│  │                                                         │    │
│  │  Distribution:                                          │    │
│  │  • Supplier: 90% (material cost)                        │    │
│  │  • Delivery Provider: 8% (delivery fee)                 │    │
│  │  • Platform: 2% (service fee)                           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  DISPUTE HANDLING:                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  If issue reported within 24 hours of delivery:         │    │
│  │                                                         │    │
│  │  1. Funds remain in escrow                              │    │
│  │  2. Investigation initiated                             │    │
│  │  3. Evidence reviewed (photos, QR scans, GPS)           │    │
│  │  4. Resolution options:                                 │    │
│  │     a) Full refund to builder                           │    │
│  │     b) Partial refund                                   │    │
│  │     c) Release to supplier                              │    │
│  │     d) Mediation required                               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Invoice & Receipt Management

### 4.1 Invoice Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVOICE WORKFLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRIGGER: Quote accepted by builder                             │
│                          │                                      │
│                          ▼                                      │
│  INVOICE GENERATED:                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🏗️ UjenziXform                                           │    │
│  │  TAX INVOICE                                            │    │
│  │                                                         │    │
│  │  Invoice No: INV-2025-001234                            │    │
│  │  Date: December 3, 2025                                 │    │
│  │  Due Date: December 3, 2025 (Immediate)                 │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  FROM:                      TO:                         │    │
│  │  ABC Hardware Ltd           John Kamau Construction     │    │
│  │  KRA PIN: A123456789B       KRA PIN: P987654321C        │    │
│  │  VAT No: 0123456789         VAT No: 0987654321          │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  ITEMS:                                                 │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Description      │ Qty │ Unit Price │ Amount      │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ Bamburi Cement   │ 100 │ KES 820    │ KES 82,000  │ │    │
│  │  │ Y12 Rebar 12m    │ 50  │ KES 1,150  │ KES 57,500  │ │    │
│  │  │ River Sand       │ 10  │ KES 2,400  │ KES 24,000  │ │    │
│  │  │ Delivery Fee     │ 1   │ KES 5,000  │ KES 5,000   │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  Subtotal (Excl. VAT):     KES 168,500                  │    │
│  │  VAT (16%):                KES  26,960                  │    │
│  │  ─────────────────────────────────────────             │    │
│  │  TOTAL:                    KES 195,460                  │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  PAYMENT DETAILS:                                       │    │
│  │  M-Pesa Paybill: 123456                                 │    │
│  │  Account: INV-2025-001234                               │    │
│  │                                                         │    │
│  │  Bank: Equity Bank                                      │    │
│  │  Account: 1234567890123                                 │    │
│  │  Name: UjenziXform Ltd                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Receipt Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                   RECEIPT WORKFLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRIGGER: Payment confirmed                                     │
│                          │                                      │
│                          ▼                                      │
│  RECEIPT GENERATED & SENT:                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🏗️ UjenziXform                                           │    │
│  │  PAYMENT RECEIPT                                        │    │
│  │                                                         │    │
│  │  Receipt No: RCT-2025-001234                            │    │
│  │  Date: December 3, 2025                                 │    │
│  │  Time: 11:23:45 AM                                      │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  PAYMENT DETAILS:                                       │    │
│  │                                                         │    │
│  │  Amount Paid:      KES 195,460.00                       │    │
│  │  Payment Method:   M-Pesa                               │    │
│  │  Transaction ID:   QK12AB34CD                           │    │
│  │  Phone Number:     254712***678                         │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  FOR:                                                   │    │
│  │  Order: PO-2025-001234                                  │    │
│  │  Invoice: INV-2025-001234                               │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  STATUS: PAID ✓                                         │    │
│  │                                                         │    │
│  │  Thank you for your payment!                            │    │
│  │  Your order is now being processed.                     │    │
│  │                                                         │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  [Download PDF]  [Email Copy]  [Print]                  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  AUTOMATED ACTIONS:                                             │
│  • Email sent to builder                                        │
│  • SMS confirmation sent                                        │
│  • Supplier notified                                            │
│  • Order status updated                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Security Framework

### 5.1 Authentication Security

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION SECURITY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  JWT TOKEN MANAGEMENT                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Token Structure:                                       │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ HEADER:                                           │ │    │
│  │  │ {                                                 │ │    │
│  │  │   "alg": "HS256",                                 │ │    │
│  │  │   "typ": "JWT"                                    │ │    │
│  │  │ }                                                 │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ PAYLOAD:                                          │ │    │
│  │  │ {                                                 │ │    │
│  │  │   "sub": "user-uuid",                             │ │    │
│  │  │   "email": "user@example.com",                    │ │    │
│  │  │   "role": "builder",                              │ │    │
│  │  │   "iat": 1701600000,                              │ │    │
│  │  │   "exp": 1701686400                               │ │    │
│  │  │ }                                                 │ │    │
│  │  ├───────────────────────────────────────────────────┤ │    │
│  │  │ SIGNATURE:                                        │ │    │
│  │  │ HMACSHA256(base64(header) + "." +                 │ │    │
│  │  │            base64(payload), secret)               │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  Token Lifecycle:                                       │    │
│  │  • Access Token: 1 hour expiry                          │    │
│  │  • Refresh Token: 7 days expiry                         │    │
│  │  • Auto-refresh before expiry                           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  OAUTH 2.0 PROVIDERS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🔵 Google OAuth                                        │    │
│  │     • OpenID Connect                                    │    │
│  │     • Email verification                                │    │
│  │     • Profile sync                                      │    │
│  │                                                         │    │
│  │  ⚫ GitHub OAuth                                        │    │
│  │     • Developer accounts                                │    │
│  │     • Email access                                      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  PASSWORD SECURITY                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Requirements:                                          │    │
│  │  • Minimum 8 characters                                 │    │
│  │  • At least 1 uppercase letter                          │    │
│  │  • At least 1 lowercase letter                          │    │
│  │  • At least 1 number                                    │    │
│  │  • At least 1 special character                         │    │
│  │                                                         │    │
│  │  Storage:                                               │    │
│  │  • bcrypt hashing (cost factor 12)                      │    │
│  │  • Salted hashes                                        │    │
│  │  • No plain text storage                                │    │
│  │                                                         │    │
│  │  Brute Force Protection:                                │    │
│  │  • 5 failed attempts → 15 min lockout                   │    │
│  │  • 10 failed attempts → 1 hour lockout                  │    │
│  │  • 15 failed attempts → account locked                  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Row Level Security (RLS)

```
┌─────────────────────────────────────────────────────────────────┐
│                   ROW LEVEL SECURITY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATABASE-LEVEL ACCESS CONTROL                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  PROFILES TABLE:                                        │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  -- Users can only read their own profile               │    │
│  │  CREATE POLICY "Users can view own profile"             │    │
│  │  ON profiles FOR SELECT                                 │    │
│  │  USING (auth.uid() = id);                               │    │
│  │                                                         │    │
│  │  -- Users can only update their own profile             │    │
│  │  CREATE POLICY "Users can update own profile"           │    │
│  │  ON profiles FOR UPDATE                                 │    │
│  │  USING (auth.uid() = id);                               │    │
│  │                                                         │    │
│  │  -- Admins can view all profiles                        │    │
│  │  CREATE POLICY "Admins can view all profiles"           │    │
│  │  ON profiles FOR SELECT                                 │    │
│  │  USING (                                                │    │
│  │    EXISTS (                                             │    │
│  │      SELECT 1 FROM user_roles                           │    │
│  │      WHERE user_id = auth.uid()                         │    │
│  │      AND role = 'admin'                                 │    │
│  │    )                                                    │    │
│  │  );                                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ORDERS TABLE:                                          │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  -- Builders can view their own orders                  │    │
│  │  CREATE POLICY "Builders view own orders"               │    │
│  │  ON orders FOR SELECT                                   │    │
│  │  USING (builder_id = auth.uid());                       │    │
│  │                                                         │    │
│  │  -- Suppliers can view orders to them                   │    │
│  │  CREATE POLICY "Suppliers view their orders"            │    │
│  │  ON orders FOR SELECT                                   │    │
│  │  USING (supplier_id IN (                                │    │
│  │    SELECT id FROM suppliers                             │    │
│  │    WHERE owner_id = auth.uid()                          │    │
│  │  ));                                                    │    │
│  │                                                         │    │
│  │  -- Delivery providers view assigned deliveries         │    │
│  │  CREATE POLICY "Providers view assigned deliveries"     │    │
│  │  ON orders FOR SELECT                                   │    │
│  │  USING (delivery_provider_id = auth.uid());             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  MONITORING ACCESS:                                     │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │                                                         │    │
│  │  -- Builders can only VIEW (not control) cameras        │    │
│  │  CREATE POLICY "Builders view assigned cameras"         │    │
│  │  ON camera_feeds FOR SELECT                             │    │
│  │  USING (                                                │    │
│  │    project_id IN (                                      │    │
│  │      SELECT id FROM projects                            │    │
│  │      WHERE builder_id = auth.uid()                      │    │
│  │    )                                                    │    │
│  │  );                                                     │    │
│  │                                                         │    │
│  │  -- Only admins can control cameras                     │    │
│  │  CREATE POLICY "Admins control cameras"                 │    │
│  │  ON camera_controls FOR ALL                             │    │
│  │  USING (                                                │    │
│  │    EXISTS (                                             │    │
│  │      SELECT 1 FROM user_roles                           │    │
│  │      WHERE user_id = auth.uid()                         │    │
│  │      AND role = 'admin'                                 │    │
│  │    )                                                    │    │
│  │  );                                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Data Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATA ENCRYPTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ENCRYPTION AT REST                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Database Encryption:                                   │    │
│  │  • PostgreSQL Transparent Data Encryption (TDE)         │    │
│  │  • AES-256 encryption                                   │    │
│  │  • Key managed by Supabase                              │    │
│  │                                                         │    │
│  │  Field-Level Encryption (Sensitive Data):               │    │
│  │  • National ID numbers                                  │    │
│  │  • Bank account details                                 │    │
│  │  • M-Pesa numbers (partial)                             │    │
│  │  • KRA PIN numbers                                      │    │
│  │                                                         │    │
│  │  Storage Encryption:                                    │    │
│  │  • All uploaded files encrypted                         │    │
│  │  • Document storage with AES-256                        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ENCRYPTION IN TRANSIT                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  TLS Configuration:                                     │    │
│  │  • TLS 1.3 (minimum TLS 1.2)                            │    │
│  │  • Strong cipher suites only                            │    │
│  │  • Perfect Forward Secrecy (PFS)                        │    │
│  │  • HSTS enabled                                         │    │
│  │                                                         │    │
│  │  API Security:                                          │    │
│  │  • All API calls over HTTPS                             │    │
│  │  • Certificate pinning (mobile app)                     │    │
│  │  • Request signing for sensitive operations             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Security Monitoring

```
┌─────────────────────────────────────────────────────────────────┐
│                   SECURITY MONITORING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REAL-TIME THREAT DETECTION                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Monitored Events:                                      │    │
│  │  • Failed login attempts                                │    │
│  │  • Unusual access patterns                              │    │
│  │  • API rate limit violations                            │    │
│  │  • Suspicious transactions                              │    │
│  │  • Geographic anomalies                                 │    │
│  │                                                         │    │
│  │  Alert Triggers:                                        │    │
│  │  • Multiple failed logins from same IP                  │    │
│  │  • Access from new device/location                      │    │
│  │  • Large transaction amounts                            │    │
│  │  • After-hours admin access                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  AUDIT LOGGING                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Logged Actions:                                        │    │
│  │  • All authentication events                            │    │
│  │  • Data access (read/write)                             │    │
│  │  • Permission changes                                   │    │
│  │  • Financial transactions                               │    │
│  │  • Admin actions                                        │    │
│  │                                                         │    │
│  │  Log Format:                                            │    │
│  │  {                                                      │    │
│  │    "timestamp": "2025-12-03T11:23:45Z",                 │    │
│  │    "user_id": "uuid",                                   │    │
│  │    "action": "order.create",                            │    │
│  │    "resource": "orders/PO-2025-001234",                 │    │
│  │    "ip_address": "192.168.1.1",                         │    │
│  │    "user_agent": "Mozilla/5.0...",                      │    │
│  │    "status": "success",                                 │    │
│  │    "details": {...}                                     │    │
│  │  }                                                      │    │
│  │                                                         │    │
│  │  Retention: 2 years                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  RATE LIMITING                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  API Limits:                                            │    │
│  │  • General API: 100 requests/minute                     │    │
│  │  • Authentication: 5 attempts/15 minutes                │    │
│  │  • File uploads: 10 files/hour                          │    │
│  │  • Payment initiation: 3 attempts/hour                  │    │
│  │                                                         │    │
│  │  Implementation:                                        │    │
│  │  • Token bucket algorithm                               │    │
│  │  • Per-user and per-IP limits                           │    │
│  │  • Graceful degradation                                 │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Privacy & Compliance

### 6.1 Kenya DPA 2019 Compliance

```
┌─────────────────────────────────────────────────────────────────┐
│                   DPA 2019 COMPLIANCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATA SUBJECT RIGHTS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ✓ Right to be informed                                 │    │
│  │    • Privacy policy clearly displayed                   │    │
│  │    • Data collection purposes explained                 │    │
│  │                                                         │    │
│  │  ✓ Right of access                                      │    │
│  │    • Users can download their data                      │    │
│  │    • Export in machine-readable format                  │    │
│  │                                                         │    │
│  │  ✓ Right to rectification                               │    │
│  │    • Users can update their information                 │    │
│  │    • Profile editing available                          │    │
│  │                                                         │    │
│  │  ✓ Right to erasure                                     │    │
│  │    • Account deletion available                         │    │
│  │    • Data removed within 30 days                        │    │
│  │                                                         │    │
│  │  ✓ Right to data portability                            │    │
│  │    • Export data in JSON/CSV                            │    │
│  │    • Transfer to other services                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  CONSENT MANAGEMENT                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Consent Types:                                         │    │
│  │  • Terms of Service (required)                          │    │
│  │  • Privacy Policy (required)                            │    │
│  │  • Marketing communications (optional)                  │    │
│  │  • Data sharing with partners (optional)                │    │
│  │  • Analytics cookies (optional)                         │    │
│  │                                                         │    │
│  │  Consent Records:                                       │    │
│  │  • Timestamp of consent                                 │    │
│  │  • Version of policy agreed to                          │    │
│  │  • Method of consent (click, signature)                 │    │
│  │  • Withdrawal option available                          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  DATA PROTECTION OFFICER                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Contact: dpo@ujenzixform.org                            │    │
│  │                                                         │    │
│  │  Responsibilities:                                      │    │
│  │  • Oversee data protection strategy                     │    │
│  │  • Handle data subject requests                         │    │
│  │  • Liaise with ODPC                                     │    │
│  │  • Conduct privacy impact assessments                   │    │
│  │  • Staff training on data protection                    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Hooks Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                   SECURITY HOOKS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HOOK                          │ PURPOSE                        │
│  ──────────────────────────────┼────────────────────────────    │
│  useAdvancedSecurity           │ Core security features         │
│  usePageSecurity               │ Page-level protection          │
│  useRateLimiting               │ API rate limiting              │
│  useSecurityMonitor            │ Real-time monitoring           │
│  useDeliveryThreatDetection    │ Delivery fraud detection       │
│  useContactFormSecurity        │ Form protection (CSRF, etc.)   │
│  useEnhancedScannerSecurity    │ QR scanner security            │
│  useSecureBuilders             │ Builder data protection        │
│  useSecureSuppliers            │ Supplier data protection       │
│  useSecureDeliveries           │ Delivery data protection       │
│  useSecurePayments             │ Payment security               │
│  useSecureProfiles             │ Profile data protection        │
│  useSecureCameras              │ Camera access control          │
│  useSecureProviders            │ Provider data protection       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 2.0*  
*Last Updated: December 3, 2025*








