# 🏗️ MradiPro - Complete Application Workflow Documentation

**Version**: 2.0  
**Last Updated**: December 3, 2025  
**Platform**: Kenya's Premier Construction Marketplace

---

## 📋 Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Types & Roles](#2-user-types--roles)
3. [Authentication Workflows](#3-authentication-workflows)
4. [Builder Workflows](#4-builder-workflows)
5. [Supplier Workflows](#5-supplier-workflows)
6. [Delivery Provider Workflows](#6-delivery-provider-workflows)
7. [QR Code & Scanning Workflows](#7-qr-code--scanning-workflows)
8. [Site Monitoring Workflows](#8-site-monitoring-workflows)
9. [Payment Workflows](#9-payment-workflows)
10. [Admin Workflows](#10-admin-workflows)
11. [Technical Architecture](#11-technical-architecture)
12. [Security Framework](#12-security-framework)
13. [API & Integration Reference](#13-api--integration-reference)

---

## 1. Platform Overview

### 1.1 What is MradiPro?

MradiPro is Kenya's leading digital construction marketplace that connects:
- **Builders** (contractors, construction companies, individual builders)
- **Suppliers** (hardware stores, cement distributors, steel suppliers)
- **Delivery Providers** (trucking companies, individual drivers)
- **Private Clients** (homeowners, project owners)

### 1.2 Core Value Proposition

```
┌─────────────────────────────────────────────────────────────────┐
│                     MradiPro Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   BUILDERS ←──────→ MARKETPLACE ←──────→ SUPPLIERS             │
│      │                   │                    │                 │
│      │                   │                    │                 │
│      └───────→ DELIVERY PROVIDERS ←──────────┘                 │
│                         │                                       │
│                         ▼                                       │
│              CONSTRUCTION SITES                                 │
│              (47 Counties in Kenya)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Features Summary

| Feature | Description | Users |
|---------|-------------|-------|
| Material Marketplace | Browse & purchase construction materials | Builders, Private Clients |
| Builder Directory | Find certified construction professionals | Private Clients, Suppliers |
| Delivery Tracking | GPS-enabled material delivery tracking | All Users |
| QR Verification | Material authenticity verification | Builders, Suppliers |
| Site Monitoring | Live camera/drone construction monitoring | Builders, Admins |
| M-Pesa Payments | Mobile money integration | All Users |
| Analytics Dashboard | Business intelligence & insights | Builders, Suppliers, Admins |

---

## 2. User Types & Roles

### 2.1 Role Hierarchy

```
                    ┌─────────────┐
                    │    ADMIN    │
                    │ (Full Access)│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  SUPPLIER   │ │   BUILDER   │ │  DELIVERY   │
    │             │ │             │ │  PROVIDER   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │        ┌──────▼──────┐        │
           │        │   PRIVATE   │        │
           │        │   CLIENT    │        │
           │        └─────────────┘        │
           │                               │
    ┌──────▼───────────────────────────────▼──────┐
    │                   GUEST                      │
    │            (Public Directory Only)           │
    └──────────────────────────────────────────────┘
```

### 2.2 Role Permissions Matrix

| Permission | Admin | Supplier | Builder | Delivery | Private Client | Guest |
|------------|-------|----------|---------|----------|----------------|-------|
| View Public Directory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse Materials | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Orders | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Manage Inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Accept Deliveries | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Site Monitoring | ✅ | ❌ | 👁️ View | ❌ | ❌ | ❌ |
| Camera Controls | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Analytics (Full) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Analytics (Own) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### 2.3 User Registration Paths

```
                        ┌─────────────────┐
                        │   Landing Page  │
                        │   (Index.tsx)   │
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼───────┐    │    ┌───────▼───────┐
            │ Builder Reg.  │    │    │ Supplier Reg. │
            │ /builder-     │    │    │ /supplier-    │
            │ registration  │    │    │ registration  │
            └───────┬───────┘    │    └───────┬───────┘
                    │            │            │
        ┌───────────┼───────────┐│            │
        │           │           ││            │
┌───────▼───┐ ┌─────▼─────┐     ││     ┌──────▼──────┐
│Professional│ │  Private  │     ││     │  Supplier   │
│  Builder   │ │  Client   │     ││     │  Account    │
└────────────┘ └───────────┘     ││     └─────────────┘
                                 │
                         ┌───────▼───────┐
                         │   Delivery    │
                         │   Provider    │
                         │ /delivery/    │
                         │    apply      │
                         └───────────────┘
```

---

## 3. Authentication Workflows

### 3.1 Standard Sign Up Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    SIGN UP WORKFLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User visits /auth                                            │
│         │                                                        │
│         ▼                                                        │
│  2. Choose: Sign Up tab                                          │
│         │                                                        │
│         ├──────────────────┬─────────────────┐                   │
│         │                  │                 │                   │
│         ▼                  ▼                 ▼                   │
│  3a. Email/Password   3b. Google OAuth   3c. GitHub OAuth        │
│         │                  │                 │                   │
│         ▼                  ▼                 ▼                   │
│  4. Account Created in Supabase Auth                             │
│         │                                                        │
│         ▼                                                        │
│  5. Profile record created in 'profiles' table                   │
│         │                                                        │
│         ▼                                                        │
│  6. Role assigned in 'user_roles' table                          │
│         │                                                        │
│         ▼                                                        │
│  7. Redirect to /suppliers (default) or specified redirect       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Sign In Flow

```
User → /auth → Enter Credentials → Supabase Auth → 
    → Verify → Get Session → Load User Role → Redirect to Dashboard
```

### 3.3 Password Reset Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  PASSWORD RESET WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Forgot Password" on /auth                      │
│         │                                                       │
│         ▼                                                       │
│  2. SimplePasswordReset modal opens                             │
│         │                                                       │
│         ▼                                                       │
│  3. User enters email address                                   │
│         │                                                       │
│         ▼                                                       │
│  4. Supabase sends reset email                                  │
│         │                                                       │
│         ▼                                                       │
│  5. User clicks link in email                                   │
│         │                                                       │
│         ▼                                                       │
│  6. Redirected to /reset-password                               │
│         │                                                       │
│         ▼                                                       │
│  7. User enters new password                                    │
│         │                                                       │
│         ▼                                                       │
│  8. Password updated → Redirect to /auth                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Admin Authentication

```
/admin-login → Staff Email Verification → 
    → Role Check (must be 'admin') → Admin Dashboard
```

**Files Involved:**
- `src/pages/Auth.tsx` - Main auth page
- `src/pages/AdminAuth.tsx` - Admin-only login
- `src/pages/ResetPassword.tsx` - Password reset
- `src/components/SimplePasswordReset.tsx` - Reset modal
- `src/contexts/AuthContext.tsx` - Auth state management

---

## 4. Builder Workflows

### 4.1 Builder Registration

```
┌─────────────────────────────────────────────────────────────────┐
│                 BUILDER REGISTRATION WORKFLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Choose Builder Type                                    │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Professional   │    │  Private Client │                     │
│  │    Builder      │    │   (Homeowner)   │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                              │
│           ▼                      ▼                              │
│  STEP 2: Fill Registration Form                                 │
│  • Full Name                     • Full Name                    │
│  • Company Name                  • Email                        │
│  • KRA PIN                       • Phone                        │
│  • Business Reg. No.             • Location                     │
│  • Years Experience              • Project Type                 │
│  • Specializations                                              │
│           │                      │                              │
│           ▼                      ▼                              │
│  STEP 3: Create Account (Email/Password)                        │
│           │                      │                              │
│           ▼                      ▼                              │
│  STEP 4: Profile Saved to Database                              │
│           │                      │                              │
│           ▼                      ▼                              │
│  STEP 5: Role Assigned                                          │
│  • 'builder' or                  • 'private_client'             │
│  • 'professional_builder'                                       │
│           │                      │                              │
│           ▼                      ▼                              │
│  STEP 6: Redirect to Dashboard/Suppliers                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Material Sourcing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                MATERIAL SOURCING WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Builder visits /suppliers                                   │
│         │                                                       │
│         ▼                                                       │
│  2. Browse materials by category:                               │
│     • Cement & Concrete                                         │
│     • Steel & Iron                                              │
│     • Timber & Wood                                             │
│     • Roofing Materials                                         │
│     • Plumbing & Pipes                                          │
│     • Electrical                                                │
│     • Finishing Materials                                       │
│         │                                                       │
│         ▼                                                       │
│  3. View supplier details:                                      │
│     • Company profile                                           │
│     • Product catalog                                           │
│     • Pricing                                                   │
│     • Ratings & reviews                                         │
│     • Location/delivery areas                                   │
│         │                                                       │
│         ▼                                                       │
│  4. Request Quote (QuoteRequestModal)                           │
│     • Select products                                           │
│     • Specify quantities                                        │
│     • Add delivery location                                     │
│         │                                                       │
│         ▼                                                       │
│  5. Supplier receives notification                              │
│         │                                                       │
│         ▼                                                       │
│  6. Supplier responds with quote                                │
│         │                                                       │
│         ▼                                                       │
│  7. Builder reviews & accepts quote                             │
│         │                                                       │
│         ▼                                                       │
│  8. Create Purchase Order                                       │
│         │                                                       │
│         ▼                                                       │
│  9. Process Payment (M-Pesa/Bank)                               │
│         │                                                       │
│         ▼                                                       │
│  10. Delivery scheduled                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Builder Dashboard Features

```
┌─────────────────────────────────────────────────────────────────┐
│                   BUILDER DASHBOARD                              │
│                    (/builders)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    TAB NAVIGATION                        │    │
│  ├──────────┬──────────┬──────────┬──────────┬─────────────┤    │
│  │ Workflow │ Analytics│ Reviews  │ Projects │ Materials   │    │
│  └──────────┴──────────┴──────────┴──────────┴─────────────┘    │
│                                                                 │
│  WORKFLOW TAB:                                                  │
│  • QuickDashboard - Overview stats                              │
│  • Active projects summary                                      │
│  • Pending orders                                               │
│  • Upcoming deliveries                                          │
│                                                                 │
│  ANALYTICS TAB:                                                 │
│  • SimpleAnalyticsDashboard                                     │
│  • Spending trends                                              │
│  • Supplier performance                                         │
│  • Project costs                                                │
│                                                                 │
│  REVIEWS TAB:                                                   │
│  • ReviewsSystem                                                │
│  • View received reviews                                        │
│  • Respond to feedback                                          │
│  • Rating statistics                                            │
│                                                                 │
│  PROJECTS TAB:                                                  │
│  • BuilderProjectManager                                        │
│  • Create/manage projects                                       │
│  • Track progress                                               │
│  • Budget management                                            │
│                                                                 │
│  MATERIALS TAB:                                                 │
│  • BuilderMaterialManager                                       │
│  • Purchase history                                             │
│  • Reorder materials                                            │
│  • Price tracking                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Files Involved:**
- `src/pages/Builders.tsx` - Builder directory & dashboard
- `src/pages/BuilderRegistration.tsx` - Registration form
- `src/pages/ProfessionalBuilderRegistration.tsx` - Pro builder reg
- `src/pages/PrivateBuilderRegistration.tsx` - Private client reg
- `src/components/builders/*` - Builder-specific components

---

## 5. Supplier Workflows

### 5.1 Supplier Registration

```
┌─────────────────────────────────────────────────────────────────┐
│                 SUPPLIER REGISTRATION WORKFLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Visit /supplier-registration                                │
│         │                                                       │
│         ▼                                                       │
│  2. Fill Company Details:                                       │
│     • Company Name                                              │
│     • Business Registration Number                              │
│     • KRA PIN                                                   │
│     • Physical Address                                          │
│     • Counties Served                                           │
│         │                                                       │
│         ▼                                                       │
│  3. Select Material Categories:                                 │
│     □ Cement & Concrete                                         │
│     □ Steel & Metal                                             │
│     □ Timber & Wood                                             │
│     □ Roofing                                                   │
│     □ Plumbing                                                  │
│     □ Electrical                                                │
│     □ Finishing                                                 │
│         │                                                       │
│         ▼                                                       │
│  4. Add Products (Optional at registration)                     │
│     • Product name                                              │
│     • Description                                               │
│     • Price                                                     │
│     • Unit (bags, pieces, kg, etc.)                             │
│     • Images                                                    │
│         │                                                       │
│         ▼                                                       │
│  5. Create Account                                              │
│         │                                                       │
│         ▼                                                       │
│  6. Verification Process (Admin review)                         │
│         │                                                       │
│         ▼                                                       │
│  7. Account Approved → Access Supplier Dashboard                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Supplier Order Management

```
┌─────────────────────────────────────────────────────────────────┐
│                 ORDER MANAGEMENT WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INCOMING ORDER FLOW:                                           │
│                                                                 │
│  Builder creates order                                          │
│         │                                                       │
│         ▼                                                       │
│  Supplier receives notification                                 │
│  (DeliveryProviderNotifications)                                │
│         │                                                       │
│         ▼                                                       │
│  Review order details:                                          │
│  • Products requested                                           │
│  • Quantities                                                   │
│  • Delivery location                                            │
│  • Requested delivery date                                      │
│         │                                                       │
│         ├─────────────────────┐                                 │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  ACCEPT ORDER           REJECT ORDER                            │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  Prepare materials      Notify builder                          │
│         │               with reason                             │
│         ▼                                                       │
│  Generate QR codes                                              │
│  (QRCodeManager)                                                │
│         │                                                       │
│         ▼                                                       │
│  Schedule delivery                                              │
│         │                                                       │
│         ▼                                                       │
│  Match with delivery provider                                   │
│  (AI Provider Matching)                                         │
│         │                                                       │
│         ▼                                                       │
│  Dispatch materials                                             │
│         │                                                       │
│         ▼                                                       │
│  Track delivery in real-time                                    │
│         │                                                       │
│         ▼                                                       │
│  Delivery confirmed                                             │
│  (GoodsReceivedNote)                                            │
│         │                                                       │
│         ▼                                                       │
│  Payment released                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Inventory Management

```
Supplier Dashboard → Inventory Tab → 
    → Add/Edit Products → Set Prices → Upload Images →
    → Set Stock Levels → Enable/Disable Products
```

**Files Involved:**
- `src/pages/SuppliersMobileOptimized.tsx` - Supplier marketplace
- `src/pages/SupplierRegistration.tsx` - Registration
- `src/components/suppliers/*` - Supplier components
- `src/components/suppliers/MaterialsGrid.tsx` - Product display
- `src/components/suppliers/SupplierApplicationManager.tsx` - Applications

---

## 6. Delivery Provider Workflows

### 6.1 Driver Registration

```
┌─────────────────────────────────────────────────────────────────┐
│              DELIVERY PROVIDER REGISTRATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Visit /delivery/apply                                       │
│         │                                                       │
│         ▼                                                       │
│  2. Choose Provider Type:                                       │
│     ┌─────────────────┐    ┌─────────────────┐                  │
│     │   Individual    │    │    Company      │                  │
│     │    Driver       │    │    (Fleet)      │                  │
│     └────────┬────────┘    └────────┬────────┘                  │
│              │                      │                           │
│              ▼                      ▼                           │
│  3. Fill Application:                                           │
│     INDIVIDUAL:                COMPANY:                         │
│     • Full Name                • Company Name                   │
│     • National ID              • Business Reg.                  │
│     • Driver's License         • Fleet Size                     │
│     • Vehicle Details          • Insurance Details              │
│     • Phone Number             • Contact Person                 │
│     • Counties Served          • Counties Served                │
│              │                      │                           │
│              ▼                      ▼                           │
│  4. Upload Documents:                                           │
│     • ID Copy                                                   │
│     • License Copy                                              │
│     • Vehicle Registration                                      │
│     • Insurance Certificate                                     │
│              │                                                  │
│              ▼                                                  │
│  5. Background Check (Admin)                                    │
│              │                                                  │
│              ▼                                                  │
│  6. Approval → Access Driver App                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Delivery Acceptance Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  DELIVERY ACCEPTANCE FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. New delivery request created                                │
│         │                                                       │
│         ▼                                                       │
│  2. AI matches suitable providers                               │
│     (useAIProviderMatching)                                     │
│     Factors:                                                    │
│     • Location proximity                                        │
│     • Vehicle capacity                                          │
│     • Rating score                                              │
│     • Availability                                              │
│     • Past performance                                          │
│         │                                                       │
│         ▼                                                       │
│  3. Send notifications to matched providers                     │
│     (Push, SMS, Email)                                          │
│         │                                                       │
│         ▼                                                       │
│  4. Provider reviews request:                                   │
│     • Pickup location                                           │
│     • Delivery location                                         │
│     • Material type & weight                                    │
│     • Offered payment                                           │
│         │                                                       │
│         ├─────────────────────┐                                 │
│         │                     │                                 │
│         ▼                     ▼                                 │
│     ACCEPT                  DECLINE                             │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  5. Confirm pickup time   Re-alert other                        │
│         │                 providers                             │
│         ▼                                                       │
│  6. Navigate to supplier                                        │
│     (GPS tracking enabled)                                      │
│         │                                                       │
│         ▼                                                       │
│  7. SUPPLIER scans QR codes during loading                      │
│     (Driver does NOT scan at pickup)                            │
│         │                                                       │
│         ▼                                                       │
│  8. Start delivery                                              │
│     (GPS tracking only - NO scanning during transit)            │
│         │                                                       │
│         ▼                                                       │
│  9. Arrive at destination & offload materials                   │
│         │                                                       │
│         ▼                                                       │
│  10. DRIVER scans ALL items after offloading                    │
│      • Scan each QR code                                        │
│      • Report any damages                                       │
│      • Upload photos of ALL items                               │
│      • Upload photos of damages (if any)                        │
│         │                                                       │
│         ▼                                                       │
│  11. GRN auto-generated with photos & scan data                 │
│         │                                                       │
│         ▼                                                       │
│  12. Delivery complete → Payment released                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Delivery Cancellation & Reassignment

```
Provider cancels delivery
        │
        ▼
DeliveryReassignmentService activated
        │
        ▼
Notify builder of cancellation
        │
        ▼
Find alternative providers
        │
        ├── Found → Re-alert with bonus incentive
        │
        └── Not Found → Escalate to admin
```

**Files Involved:**
- `src/pages/DeliveryProviderApplication.tsx` - Driver registration
- `src/pages/Delivery.tsx` - Delivery management
- `src/components/delivery/*` - Delivery components
- `src/services/DeliveryReassignmentService.ts` - Reassignment logic
- `src/hooks/useAIProviderMatching.ts` - AI matching

---

## 7. QR Code & Scanning Workflows

### 7.1 QR Code Generation (Automatic on Order)

```
┌─────────────────────────────────────────────────────────────────┐
│                   QR CODE GENERATION                             │
│            (Automatic - Triggered by Order Placement)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚡ QR codes are generated IMMEDIATELY when:                    │
│  • Professional Builder places an order                         │
│  • Private Client buys items directly from supplier             │
│                                                                 │
│  1. Order placed by Builder/Client                              │
│         │                                                       │
│         ▼                                                       │
│  2. SYSTEM AUTO-GENERATES QR CODES                              │
│     ┌─────────────────────────────────────────┐                 │
│     │           QR CODE DATA                  │                 │
│     ├─────────────────────────────────────────┤                 │
│     │ • Unique Material ID                    │                 │
│     │ • Product Name                          │                 │
│     │ • Quantity                              │                 │
│     │ • Batch Number                          │                 │
│     │ • Supplier ID                           │                 │
│     │ • Order ID                              │                 │
│     │ • Timestamp                             │                 │
│     │ • Digital Signature                     │                 │
│     └─────────────────────────────────────────┘                 │
│         │                                                       │
│         ▼                                                       │
│  3. Supplier notified: "QR codes ready for download"            │
│         │                                                       │
│         ▼                                                       │
│  4. SUPPLIER MUST:                                              │
│     • Download QR codes from order dashboard                    │
│     • Print QR labels                                           │
│     • Attach to MATCHING items purchased by client              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 QR Scanning Workflow (2-Point System)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QR SCANNING WORKFLOW                          │
│              (Only 2 Scan Points - No Transit Scanning)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ IMPORTANT: NO SCANNING DURING TRANSIT                       │
│                                                                 │
│  SCAN POINT 1: DISPATCH (Supplier - MANDATORY)                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ When: Loading materials into delivery vehicle           │    │
│  │ Who: SUPPLIER staff                                     │    │
│  │ Actions:                                                │    │
│  │ • Scan ALL items as they are loaded                     │    │
│  │ • Verify quantities match order                         │    │
│  │ • Record dispatch timestamp                             │    │
│  │ • Create chain of custody                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  TRANSIT: GPS TRACKING ONLY (No Scanning)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Driver focuses on safe transportation                 │    │
│  │ • Real-time GPS tracking active                         │    │
│  │ • NO scanning required during transit                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  SCAN POINT 2: DELIVERY (Driver - MANDATORY)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ When: AFTER offloading at delivery site                 │    │
│  │ Who: DELIVERY PROVIDER (Driver)                         │    │
│  │ Actions:                                                │    │
│  │ • Scan ALL delivered materials                          │    │
│  │ • Report any damages                                    │    │
│  │ • Upload photos of ALL items after offload              │    │
│  │ • Upload photos of ANY damages                          │    │
│  │ • Both items & damages MUST have photo evidence         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  GRN AUTO-GENERATED                                             │
│  • Includes all scan data                                       │
│  • Includes all photos                                          │
│  • Includes damage reports                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Material Verification

```
Scan QR Code → Decode Data → Verify Signature → 
    → Check Database → Display Material Info → 
    → Confirm/Report Issue → Upload Photos
```

**Files Involved:**
- `src/pages/Scanners.tsx` - Scanner page
- `src/components/QRScanner.tsx` - QR scanner component
- `src/components/QRCodeManager.tsx` - QR generation
- `src/components/qr/*` - QR-related components
- `src/hooks/useOfflineScanner.ts` - Offline scanning
- `src/hooks/useRealtimeScannerSync.ts` - Real-time sync

---

## 8. Site Monitoring Workflows

### 8.1 Monitoring Service Request

```
┌─────────────────────────────────────────────────────────────────┐
│              MONITORING SERVICE REQUEST                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Builder visits /monitoring                                  │
│         │                                                       │
│         ▼                                                       │
│  2. Click "Request Monitoring Service"                          │
│         │                                                       │
│         ▼                                                       │
│  3. Fill request form:                                          │
│     • Project Name                                              │
│     • Site Location (GPS)                                       │
│     • Monitoring Type:                                          │
│       □ Fixed Cameras                                           │
│       □ Drone Surveillance                                      │
│       □ Both                                                    │
│     • Duration                                                  │
│     • Special Requirements                                      │
│         │                                                       │
│         ▼                                                       │
│  4. Submit request                                              │
│         │                                                       │
│         ▼                                                       │
│  5. Admin reviews request                                       │
│     (MonitoringRequestsManager)                                 │
│         │                                                       │
│         ▼                                                       │
│  6. Quote provided to builder                                   │
│         │                                                       │
│         ▼                                                       │
│  7. Builder approves & pays                                     │
│         │                                                       │
│         ▼                                                       │
│  8. Equipment installed                                         │
│         │                                                       │
│         ▼                                                       │
│  9. Monitoring access granted                                   │
│     (View-only for builder)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Live Monitoring Access

```
┌─────────────────────────────────────────────────────────────────┐
│                 MONITORING ACCESS LEVELS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADMIN ACCESS:                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • View all camera feeds                                 │    │
│  │ • Control cameras (pan, tilt, zoom)                     │    │
│  │ • Start/stop recording                                  │    │
│  │ • Access archived footage                               │    │
│  │ • Manage drone flights                                  │    │
│  │ • Configure alerts                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  BUILDER ACCESS (View-Only):                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • View assigned project cameras                         │    │
│  │ • Watch live feeds                                      │    │
│  │ • View progress snapshots                               │    │
│  │ • NO camera controls                                    │    │
│  │ • NO recording access                                   │    │
│  │ • NO drone control                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Components:                                                    │
│  • LiveSiteMonitor - Main monitoring interface                  │
│  • DroneMonitor - Drone feed viewer                             │
│  • PhysicalCameraViewer - Camera feeds                          │
│  • CameraControls - Admin-only controls                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Files Involved:**
- `src/pages/Monitoring.tsx` - Monitoring page
- `src/components/monitoring/*` - Monitoring components
- `src/components/LiveStreamMonitor.tsx` - Live feeds
- `src/components/DroneMonitor.tsx` - Drone monitoring
- `src/services/PhysicalCameraService.ts` - Camera service

---

## 9. Payment Workflows

### 9.1 M-Pesa Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    M-PESA PAYMENT FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User initiates payment                                      │
│         │                                                       │
│         ▼                                                       │
│  2. Select M-Pesa as payment method                             │
│     (KenyanPaymentGateway)                                      │
│         │                                                       │
│         ▼                                                       │
│  3. Enter M-Pesa phone number                                   │
│         │                                                       │
│         ▼                                                       │
│  4. Initiate STK Push                                           │
│     (Daraja API)                                                │
│         │                                                       │
│         ▼                                                       │
│  5. User receives prompt on phone                               │
│     ┌─────────────────────────────────────┐                     │
│     │  M-PESA                             │                     │
│     │  Pay KES 50,000 to MradiPro?        │                     │
│     │  Enter M-PESA PIN to confirm        │                     │
│     │  [____]                             │                     │
│     └─────────────────────────────────────┘                     │
│         │                                                       │
│         ▼                                                       │
│  6. User enters PIN                                             │
│         │                                                       │
│         ▼                                                       │
│  7. Payment processed                                           │
│         │                                                       │
│         ▼                                                       │
│  8. Confirmation received                                       │
│         │                                                       │
│         ▼                                                       │
│  9. Order status updated                                        │
│         │                                                       │
│         ▼                                                       │
│  10. Receipt sent (Email/SMS)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Supported Payment Methods

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT METHODS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MOBILE MONEY:                                                  │
│  • M-Pesa (Safaricom)                                           │
│  • Airtel Money                                                 │
│  • T-Kash (Telkom)                                              │
│                                                                 │
│  BANK TRANSFERS:                                                │
│  • Direct bank transfer                                         │
│  • PesaLink                                                     │
│                                                                 │
│  CARDS:                                                         │
│  • Visa                                                         │
│  • Mastercard                                                   │
│                                                                 │
│  ESCROW:                                                        │
│  • Payment held until delivery confirmed                        │
│  • Released upon GRN signature                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Files Involved:**
- `src/components/KenyanPaymentGateway.tsx` - Payment gateway
- `src/components/payment/PaymentGateway.tsx` - Payment processing
- `src/hooks/useKenyanPayments.ts` - Payment hooks
- `src/hooks/usePaymentIntegrations.ts` - Integration hooks

---

## 10. Admin Workflows

### 10.1 Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                              │
│                    (/admin-login)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   ADMIN CAPABILITIES                     │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  USER MANAGEMENT:                                       │    │
│  │  • Approve/reject registrations                         │    │
│  │  • Manage user roles                                    │    │
│  │  • Reset passwords (AdminPasswordResetTool)             │    │
│  │  • Suspend/ban accounts                                 │    │
│  │                                                         │    │
│  │  MONITORING MANAGEMENT:                                 │    │
│  │  • Review monitoring requests                           │    │
│  │  • Approve service requests                             │    │
│  │  • Control all cameras                                  │    │
│  │  • Manage drone operations                              │    │
│  │                                                         │    │
│  │  DELIVERY MANAGEMENT:                                   │    │
│  │  • View all deliveries                                  │    │
│  │  • Resolve disputes                                     │    │
│  │  • Manage provider applications                         │    │
│  │  • Handle escalations                                   │    │
│  │                                                         │    │
│  │  ANALYTICS:                                             │    │
│  │  • Platform-wide analytics                              │    │
│  │  • ML Material Analytics                                │    │
│  │  • Revenue reports                                      │    │
│  │  • User activity                                        │    │
│  │                                                         │    │
│  │  SECURITY:                                              │    │
│  │  • Security dashboard                                   │    │
│  │  • Audit logs                                           │    │
│  │  • Threat monitoring                                    │    │
│  │  • Incident response                                    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 User Approval Workflow

```
New Registration → Admin Queue → Review Documents → 
    → Verify Business Details → Approve/Reject → 
    → Notify User → Grant Access
```

**Files Involved:**
- `src/pages/AdminAuth.tsx` - Admin login
- `src/pages/Analytics.tsx` - Analytics dashboard
- `src/pages/SecurityDashboard.tsx` - Security monitoring
- `src/components/admin/*` - Admin components

---

## 11. Technical Architecture

### 11.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      React 18                            │    │
│  │                   (with TypeScript)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │   React     │   │   Tanstack  │   │   Zustand   │            │
│  │   Router    │   │    Query    │   │   (State)   │            │
│  │   (v6)      │   │             │   │             │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    UI LAYER                              │    │
│  │  • shadcn/ui components                                  │    │
│  │  • Tailwind CSS                                          │    │
│  │  • Framer Motion (animations)                            │    │
│  │  • Lucide Icons                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                          │
│                       (Supabase)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL                            │    │
│  │                   (Database)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │     RLS     │   │    Auth     │   │   Storage   │            │
│  │  (Row Level │   │  (Supabase  │   │   (Files)   │            │
│  │  Security)  │   │    Auth)    │   │             │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Edge Functions                          │    │
│  │  • send-receipt-email                                    │    │
│  │  • send-grn-notification                                 │    │
│  │  • payment-webhook                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Real-time                               │    │
│  │  • WebSocket subscriptions                               │    │
│  │  • Live updates                                          │    │
│  │  • Presence tracking                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CORE TABLES:                                                   │
│  • profiles - User profiles                                     │
│  • user_roles - Role assignments                                │
│  • suppliers - Supplier data                                    │
│  • materials - Product catalog                                  │
│  • orders - Purchase orders                                     │
│  • deliveries - Delivery records                                │
│  • delivery_providers - Driver data                             │
│                                                                 │
│  MONITORING TABLES:                                             │
│  • monitoring_requests - Service requests                       │
│  • camera_feeds - Camera configurations                         │
│  • site_snapshots - Progress images                             │
│                                                                 │
│  TRACKING TABLES:                                               │
│  • qr_codes - Generated QR codes                                │
│  • scans - Scan records                                         │
│  • tracking_events - GPS events                                 │
│                                                                 │
│  FINANCIAL TABLES:                                              │
│  • payments - Payment records                                   │
│  • invoices - Invoice data                                      │
│  • receipts - Receipt records                                   │
│                                                                 │
│  SECURITY TABLES:                                               │
│  • audit_logs - Activity logs                                   │
│  • security_events - Security incidents                         │
│  • consent_records - Privacy consent                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Security Framework

### 12.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 1: AUTHENTICATION                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • JWT tokens                                            │    │
│  │ • OAuth 2.0 (Google, GitHub)                            │    │
│  │ • Session management                                    │    │
│  │ • MFA (optional)                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  LAYER 2: AUTHORIZATION                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Role-based access control (RBAC)                      │    │
│  │ • Row Level Security (RLS)                              │    │
│  │ • Resource-level permissions                            │    │
│  │ • API endpoint protection                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  LAYER 3: DATA PROTECTION                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • AES-256 encryption (at rest)                          │    │
│  │ • TLS 1.3 (in transit)                                  │    │
│  │ • Field-level encryption                                │    │
│  │ • Data masking                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  LAYER 4: MONITORING                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Real-time threat detection                            │    │
│  │ • Audit logging                                         │    │
│  │ • Anomaly detection                                     │    │
│  │ • Rate limiting                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Security Hooks

| Hook | Purpose |
|------|---------|
| `useAdvancedSecurity` | Core security features |
| `usePageSecurity` | Page-level protection |
| `useRateLimiting` | API rate limiting |
| `useSecurityMonitor` | Real-time monitoring |
| `useDeliveryThreatDetection` | Delivery fraud detection |
| `useContactFormSecurity` | Form protection |
| `useEnhancedScannerSecurity` | QR scanner security |

---

## 13. API & Integration Reference

### 13.1 External Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PAYMENTS:                                                      │
│  • Safaricom Daraja API (M-Pesa)                                │
│  • Airtel Money API                                             │
│  • Card payment gateway                                         │
│                                                                 │
│  COMMUNICATIONS:                                                │
│  • Africa's Talking (SMS)                                       │
│  • Resend (Email)                                               │
│  • Push notifications                                           │
│                                                                 │
│  MAPS & LOCATION:                                               │
│  • Google Maps API                                              │
│  • Geolocation API                                              │
│  • Kenya county data                                            │
│                                                                 │
│  MEDIA:                                                         │
│  • YouTube embed (videos)                                       │
│  • Supabase Storage (images)                                    │
│  • Camera streaming                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Internal Services

| Service | File | Purpose |
|---------|------|---------|
| Data Privacy | `DataPrivacyService.ts` | GDPR/DPA compliance |
| Delivery Reassignment | `DeliveryReassignmentService.ts` | Auto-reassign deliveries |
| Integration | `IntegrationService.ts` | External API integration |
| Kenyan Location | `KenyanLocationService.ts` | County/location data |
| Physical Camera | `PhysicalCameraService.ts` | Camera management |

---

## 📊 Quick Reference Diagrams

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER JOURNEY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DISCOVERY                                                      │
│  Landing Page → Browse Features → View Demo Video               │
│         │                                                       │
│         ▼                                                       │
│  REGISTRATION                                                   │
│  Choose Role → Fill Form → Verify Email → Complete Profile      │
│         │                                                       │
│         ▼                                                       │
│  ONBOARDING                                                     │
│  Dashboard Tour → Setup Preferences → First Action              │
│         │                                                       │
│         ▼                                                       │
│  CORE ACTIONS                                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │   Browse    │   Request   │    Track    │   Monitor   │      │
│  │  Materials  │   Quotes    │  Delivery   │    Site     │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  TRANSACTION                                                    │
│  Create Order → Pay (M-Pesa) → Receive Materials → Verify       │
│         │                                                       │
│         ▼                                                       │
│  FEEDBACK                                                       │
│  Rate Supplier → Write Review → Refer Others                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Reference

### Pages

| Page | Route | Description |
|------|-------|-------------|
| `Index.tsx` | `/` | Landing page |
| `Auth.tsx` | `/auth` | Authentication |
| `Builders.tsx` | `/builders` | Builder directory |
| `SuppliersMobileOptimized.tsx` | `/suppliers` | Material marketplace |
| `Delivery.tsx` | `/delivery` | Delivery management |
| `Tracking.tsx` | `/tracking` | Order tracking |
| `Monitoring.tsx` | `/monitoring` | Site monitoring |
| `Scanners.tsx` | `/scanners` | QR scanning |
| `About.tsx` | `/about` | About page |
| `Contact.tsx` | `/contact` | Contact form |
| `Feedback.tsx` | `/feedback` | User feedback |
| `TermsOfService.tsx` | `/terms` | Legal terms |
| `PrivacyPolicy.tsx` | `/privacy` | Privacy policy |

### Key Components

| Component | Purpose |
|-----------|---------|
| `Navigation.tsx` | Main navigation |
| `Footer.tsx` | Site footer |
| `KenyanPaymentGateway.tsx` | Payment processing |
| `QRCodeManager.tsx` | QR generation |
| `QRScanner.tsx` | QR scanning |
| `LiveStreamMonitor.tsx` | Camera feeds |
| `DeliveryTracker.tsx` | Delivery tracking |

---

**Document Version**: 2.0  
**Last Updated**: December 3, 2025  
**Author**: MradiPro Development Team  
**Status**: Production Ready ✅

---

*🏗️ MradiPro - Building Kenya's Future, One Connection at a Time*

