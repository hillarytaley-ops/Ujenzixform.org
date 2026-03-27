# 📝 UjenziXform User Registration Flows

## Overview

This document details all user registration workflows in the UjenziXform platform.

---

## 1. Builder Registration Paths

### 1.1 Professional Builder Registration

**Route:** `/professional-builder-registration`  
**File:** `src/pages/ProfessionalBuilderRegistration.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│            PROFESSIONAL BUILDER REGISTRATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: COMPANY INFORMATION                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Company Name *                                        │    │
│  │ • Business Registration Number *                        │    │
│  │ • KRA PIN *                                             │    │
│  │ • Year Established                                      │    │
│  │ • Number of Employees                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 2: CONTACT DETAILS                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Contact Person Name *                                 │    │
│  │ • Email Address *                                       │    │
│  │ • Phone Number * (+254...)                              │    │
│  │ • Physical Address                                      │    │
│  │ • County *                                              │    │
│  │ • Town/City                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 3: SPECIALIZATIONS                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ □ Residential Construction                              │    │
│  │ □ Commercial Construction                               │    │
│  │ □ Industrial Construction                               │    │
│  │ □ Road & Infrastructure                                 │    │
│  │ □ Renovation & Remodeling                               │    │
│  │ □ Interior Finishing                                    │    │
│  │ □ Landscaping                                           │    │
│  │ □ Plumbing & Electrical                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 4: CREDENTIALS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • NCA Registration Number                               │    │
│  │ • NCA Category (NCA 1-8)                                │    │
│  │ • Years of Experience *                                 │    │
│  │ • Portfolio Links (optional)                            │    │
│  │ • Upload: Certificate of Registration                   │    │
│  │ • Upload: NCA License                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 5: CREATE ACCOUNT                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Email (from Step 2)                                   │    │
│  │ • Password *                                            │    │
│  │ • Confirm Password *                                    │    │
│  │ □ I agree to Terms of Service                           │    │
│  │ □ I agree to Privacy Policy                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  VERIFICATION PENDING                                           │
│  • Admin reviews application                                    │
│  • Documents verified                                           │
│  • Approval email sent                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Private Client Registration

**Route:** `/private-builder-registration`  
**File:** `src/pages/PrivateBuilderRegistration.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIVATE CLIENT REGISTRATION                         │
│            (Homeowners / Individual Builders)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: PERSONAL INFORMATION                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Full Name *                                           │    │
│  │ • Email Address *                                       │    │
│  │ • Phone Number * (+254...)                              │    │
│  │ • National ID Number                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 2: PROJECT DETAILS                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Project Type:                                         │    │
│  │   ○ New Construction                                    │    │
│  │   ○ Renovation                                          │    │
│  │   ○ Extension                                           │    │
│  │   ○ Repairs                                             │    │
│  │ • Location (County) *                                   │    │
│  │ • Estimated Budget                                      │    │
│  │ • Expected Start Date                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 3: CREATE ACCOUNT                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Password *                                            │    │
│  │ • Confirm Password *                                    │    │
│  │ □ I agree to Terms of Service                           │    │
│  │ □ I agree to Privacy Policy                             │    │
│  │ □ Subscribe to newsletter                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  INSTANT ACCESS                                                 │
│  • No verification required                                     │
│  • Immediate access to marketplace                              │
│  • Can browse and purchase materials                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Supplier Registration

**Route:** `/supplier-registration`  
**File:** `src/pages/SupplierRegistration.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                  SUPPLIER REGISTRATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: BUSINESS INFORMATION                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Company/Business Name *                               │    │
│  │ • Business Type:                                        │    │
│  │   ○ Hardware Store                                      │    │
│  │   ○ Manufacturer                                        │    │
│  │   ○ Distributor                                         │    │
│  │   ○ Wholesaler                                          │    │
│  │   ○ Retailer                                            │    │
│  │ • Business Registration Number *                        │    │
│  │ • KRA PIN *                                             │    │
│  │ • Year Established                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 2: CONTACT & LOCATION                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Contact Person *                                      │    │
│  │ • Email *                                               │    │
│  │ • Phone Number *                                        │    │
│  │ • Physical Address *                                    │    │
│  │ • County *                                              │    │
│  │ • GPS Coordinates (optional)                            │    │
│  │ • Counties Served (multi-select):                       │    │
│  │   □ Nairobi    □ Mombasa    □ Kisumu                    │    │
│  │   □ Nakuru     □ Eldoret    □ Thika                     │    │
│  │   □ All 47 Counties                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 3: PRODUCT CATEGORIES                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Select categories you supply:                           │    │
│  │                                                         │    │
│  │ □ Cement & Concrete Products                            │    │
│  │   - Portland Cement                                     │    │
│  │   - Ready-mix Concrete                                  │    │
│  │   - Concrete Blocks                                     │    │
│  │                                                         │    │
│  │ □ Steel & Metal Products                                │    │
│  │   - Reinforcement Bars                                  │    │
│  │   - Structural Steel                                    │    │
│  │   - Metal Sheets                                        │    │
│  │                                                         │    │
│  │ □ Timber & Wood Products                                │    │
│  │   - Hardwood                                            │    │
│  │   - Softwood                                            │    │
│  │   - Plywood                                             │    │
│  │                                                         │    │
│  │ □ Roofing Materials                                     │    │
│  │   - Iron Sheets                                         │    │
│  │   - Tiles                                               │    │
│  │   - Gutters                                             │    │
│  │                                                         │    │
│  │ □ Plumbing & Water                                      │    │
│  │ □ Electrical Materials                                  │    │
│  │ □ Finishing Materials                                   │    │
│  │ □ Tools & Equipment                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 4: BUSINESS CAPABILITIES                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Minimum Order Value: KES [________]                   │    │
│  │ • Delivery Capability:                                  │    │
│  │   ○ Own delivery fleet                                  │    │
│  │   ○ Partner with delivery providers                     │    │
│  │   ○ Pickup only                                         │    │
│  │ • Payment Terms:                                        │    │
│  │   □ Cash on Delivery                                    │    │
│  │   □ M-Pesa                                              │    │
│  │   □ Bank Transfer                                       │    │
│  │   □ Credit (for verified buyers)                        │    │
│  │ • Operating Hours                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 5: VERIFICATION DOCUMENTS                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Upload Required Documents:                              │    │
│  │ • Business Registration Certificate *                   │    │
│  │ • KRA PIN Certificate *                                 │    │
│  │ • Business Permit (County)                              │    │
│  │ • Product Certifications (if any)                       │    │
│  │ • Company Logo                                          │    │
│  │ • Store Photos                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 6: CREATE ACCOUNT                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Password *                                            │    │
│  │ • Confirm Password *                                    │    │
│  │ □ I agree to Supplier Terms                             │    │
│  │ □ I agree to Platform Policies                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  VERIFICATION PROCESS                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Application submitted                                │    │
│  │ 2. Admin reviews documents (1-3 business days)          │    │
│  │ 3. Physical verification (if required)                  │    │
│  │ 4. Approval/Rejection email sent                        │    │
│  │ 5. If approved: Full access to supplier dashboard       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Delivery Provider Registration

**Route:** `/delivery/apply`  
**File:** `src/pages/DeliveryProviderApplication.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│              DELIVERY PROVIDER APPLICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CHOOSE PROVIDER TYPE:                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │   INDIVIDUAL        │    │   COMPANY           │             │
│  │   DRIVER            │    │   (Fleet)           │             │
│  │   🚚                │    │   🚛🚛🚛            │             │
│  └──────────┬──────────┘    └──────────┬──────────┘             │
│             │                          │                        │
│             ▼                          ▼                        │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  INDIVIDUAL DRIVER FLOW:                                        │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  STEP 1: PERSONAL DETAILS                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Full Name *                                           │    │
│  │ • National ID Number *                                  │    │
│  │ • Date of Birth *                                       │    │
│  │ • Phone Number *                                        │    │
│  │ • Email Address *                                       │    │
│  │ • Residential Address                                   │    │
│  │ • County of Residence *                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 2: DRIVING CREDENTIALS                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Driver's License Number *                             │    │
│  │ • License Class (BCE, etc.) *                           │    │
│  │ • License Expiry Date *                                 │    │
│  │ • Years of Driving Experience *                         │    │
│  │ • PSV Badge Number (if applicable)                      │    │
│  │ • Good Conduct Certificate Number                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 3: VEHICLE DETAILS                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Vehicle Type:                                         │    │
│  │   ○ Pickup Truck                                        │    │
│  │   ○ Lorry (3-ton)                                       │    │
│  │   ○ Lorry (7-ton)                                       │    │
│  │   ○ Lorry (10+ ton)                                     │    │
│  │   ○ Trailer                                             │    │
│  │ • Vehicle Registration Number *                         │    │
│  │ • Vehicle Make & Model                                  │    │
│  │ • Year of Manufacture                                   │    │
│  │ • Load Capacity (tons) *                                │    │
│  │ • Vehicle Ownership:                                    │    │
│  │   ○ Owner                                               │    │
│  │   ○ Hired                                               │    │
│  │   ○ Company Vehicle                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 4: SERVICE AREAS                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Counties you can serve (select all that apply):         │    │
│  │                                                         │    │
│  │ CENTRAL REGION:                                         │    │
│  │ □ Nairobi    □ Kiambu    □ Murang'a                     │    │
│  │ □ Nyeri      □ Kirinyaga                                │    │
│  │                                                         │    │
│  │ COAST REGION:                                           │    │
│  │ □ Mombasa    □ Kilifi    □ Kwale                        │    │
│  │                                                         │    │
│  │ WESTERN REGION:                                         │    │
│  │ □ Kisumu     □ Kakamega  □ Bungoma                      │    │
│  │                                                         │    │
│  │ RIFT VALLEY:                                            │    │
│  │ □ Nakuru     □ Uasin Gishu □ Kericho                    │    │
│  │                                                         │    │
│  │ [+ More Counties...]                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 5: UPLOAD DOCUMENTS                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Required Documents:                                     │    │
│  │ 📄 National ID (front & back) *                         │    │
│  │ 📄 Driver's License (front & back) *                    │    │
│  │ 📄 Good Conduct Certificate *                           │    │
│  │ 📄 Vehicle Registration (Logbook) *                     │    │
│  │ 📄 Vehicle Insurance Certificate *                      │    │
│  │ 📄 NTSA Inspection Certificate                          │    │
│  │ 📷 Vehicle Photos (front, back, side) *                 │    │
│  │ 📷 Passport Photo *                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 6: BANK DETAILS (for payments)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Payment Method:                                       │    │
│  │   ○ M-Pesa                                              │    │
│  │   ○ Bank Account                                        │    │
│  │ • M-Pesa Number / Bank Account Number *                 │    │
│  │ • Account Name *                                        │    │
│  │ • Bank Name (if bank)                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  STEP 7: AGREEMENT                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ □ I confirm all information provided is accurate        │    │
│  │ □ I agree to the Delivery Partner Agreement             │    │
│  │ □ I agree to maintain vehicle in good condition         │    │
│  │ □ I consent to background verification                  │    │
│  │ □ I agree to the Platform Terms of Service              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  VERIFICATION PROCESS (3-7 business days)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Document verification                                │    │
│  │ 2. Background check                                     │    │
│  │ 3. Vehicle inspection (if required)                     │    │
│  │ 4. Training session (online)                            │    │
│  │ 5. Account activation                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Admin Registration (Internal Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADMIN ACCOUNT CREATION                          │
│                    (Internal Process)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Existing Admin creates new admin account                    │
│  2. Email invitation sent                                       │
│  3. New admin sets password                                     │
│  4. MFA setup required                                          │
│  5. Access granted based on admin level                         │
│                                                                 │
│  ADMIN LEVELS:                                                  │
│  • Super Admin - Full system access                             │
│  • Operations Admin - User & delivery management                │
│  • Support Admin - Customer support only                        │
│  • Analytics Admin - Reports & analytics only                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Registration Validation Rules

### Email Validation
- Valid email format
- Not already registered
- Domain not blacklisted

### Phone Validation
- Kenyan format (+254 or 07XX)
- Valid mobile prefix (Safaricom, Airtel, Telkom)
- Not already registered

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Document Validation
- File types: PDF, JPG, PNG
- Max file size: 5MB per document
- Clear and readable
- Not expired

---

## 6. Post-Registration Flows

### Email Verification
```
Registration Complete → Verification Email Sent → 
User Clicks Link → Email Verified → Full Access
```

### Profile Completion
```
Basic Registration → Login → Profile Completion Prompt →
Add Photo → Add Details → Profile 100% Complete
```

### Onboarding Tour
```
First Login → Welcome Modal → Feature Tour →
Key Actions Highlighted → Tour Complete
```

---

*Document Version: 2.0*  
*Last Updated: December 3, 2025*








