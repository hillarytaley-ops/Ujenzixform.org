# UjenziXform Trader Invoicing System (TIS) — User & Operator Manual

**Document type:** User / operator manual (certification submission)  
**Applicant:** UjenziXform Solution  
**Product:** UjenziXform Trader Invoicing System (TIS) v1.0.0  
**Platform:** UjenziXform (construction materials marketplace, Kenya)  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Document version:** 1.0  
**Date:** 3 June 2026  

> **Status:** Applicant / in development — KRA sandbox access not yet assigned.

---

## Table of contents

1. [Purpose and audience](#1-purpose-and-audience)
2. [Roles and access](#2-roles-and-access)
3. [Before you start](#3-before-you-start)
4. [Supplier: KRA tax identity setup](#4-supplier-kra-tax-identity-setup)
5. [Builder: buyer profile for fiscal invoices](#5-builder-buyer-profile-for-fiscal-invoices)
6. [Purchase order → fiscal invoice flow](#6-purchase-order--fiscal-invoice-flow)
7. [Viewing the fiscal receipt and QR code](#7-viewing-the-fiscal-receipt-and-qr-code)
8. [Credit notes](#8-credit-notes)
9. [Administrator: TIS Integrator Hub](#9-administrator-tis-integrator-hub)
10. [Administrator: vendor onboarding](#10-administrator-vendor-onboarding)
11. [Administrator: submission operations and retry](#11-administrator-submission-operations-and-retry)
12. [Administrator: OSCU initialization](#12-administrator-oscu-initialization)
13. [Administrator: Integrator API console](#13-administrator-integrator-api-console)
14. [Common errors and resolution](#14-common-errors-and-resolution)
15. [Support and escalation](#15-support-and-escalation)
16. [Document control](#16-document-control)

---

## 1. Purpose and audience

This manual describes how **operators and end users** work with the **UjenziXform Trader Invoicing System (TIS)** — the eTIMS compliance layer embedded in UjenziXform purchase order workflows.

| Audience | What this manual covers |
|----------|-------------------------|
| **Suppliers** | Enter KRA PIN and legal business details; submit orders to eTIMS; view fiscal receipts |
| **Builders (buyers)** | Maintain billing identity; receive and verify fiscal receipts |
| **Administrators** | Onboard vendors, run OSCU initialization, monitor submissions, retry failures |
| **KRA reviewers** | Understand day-to-day operator workflows during certification |

TIS is **not** a standalone accounting product. It maps **purchase orders (POs)** to KRA **SalesReq** JSON and submits them via **`POST /invoices`** once KRA assigns sandbox or production access.

---

## 2. Roles and access

| Role | TIS capabilities |
|------|------------------|
| **Supplier** | Edit own KRA settings; manually submit PO to eTIMS; view fiscal receipt on accepted orders |
| **Builder** | View fiscal receipt on own POs; optional KRA PIN in profile for B2B invoices |
| **Admin / super_admin** | Full TIS Integrator Hub; vendor onboarding; submission ops; OSCU init; API console |
| **Guest / unauthenticated** | No TIS API access |

All outbound KRA calls require a signed-in user with role `supplier`, `admin`, or `super_admin`. KRA credentials are **never** visible in the browser.

---

## 3. Before you start

### 3.1 Prerequisites (per supplier taxpayer)

Before the first fiscal invoice can be submitted:

| Requirement | Where configured |
|-------------|------------------|
| Valid **KRA PIN** | Supplier → **KRA / eTIMS settings** |
| **Legal business name** (matches KRA registration) | Same panel |
| **Branch code** (`bhfId`, e.g. `00`) | Same panel — from KRA sandbox or production |
| **Device serial** (`dvcSrlNo`) | Same panel — from KRA after OSCU initialization |
| **Item codes** on every PO line | Supplier catalog / materials (`etims_item_code`) |
| **PO status** accepted or confirmed | Order workflow (not quote-pending) |

### 3.2 Current platform status

| Item | Status |
|------|--------|
| TIS application software | Ready for sandbox testing |
| KRA eTIMS sandbox credentials | **Pending** — subject of integrator application |
| Target sandbox URL | `https://etims-api-sbx.kra.go.ke` |
| Integrator certification | **Not held** |

Until KRA assigns sandbox access, connection tests may return **“eTIMS proxy not configured”**. Configuration is performed by administrators per the Installation & Deployment Guide.

---

## 4. Supplier: KRA tax identity setup

**Navigation:** Supplier dashboard → **Invoices & documents** → **KRA / eTIMS settings** tab  
**Component:** `SupplierEtimsSettingsPanel`

### 4.1 Fields to complete

| Field | Purpose |
|-------|---------|
| Legal business name | Printed on fiscal receipt; maps to `traderName` |
| KRA PIN | Supplier taxpayer ID; maps to `traderTin` / `sellerPin` |
| VAT registration status | Internal compliance context |
| Physical business address | Invoice and audit reference |
| Invoice contact phone / email | Operational contact |
| Branch code | KRA branch office ID (`bhfId`) |
| Business place code | KRA business place reference where applicable |
| Device serial | OSCU device serial after initialization |
| Default payment type | Maps to KRA payment type code (default `01`) |
| Invoice notes | Optional footer text on supplier-facing documents |

### 4.2 Save and test connection

1. Enter all required fields and click **Save**.
2. Click **Test connection** (when sandbox is configured) to verify `etims-proxy` reachability.
3. Resolve any KRA PIN validation errors before accepting new orders.

**PIN format:** Validated by `isValidKraPin()` — must conform to KRA PIN rules before checkout and submission.

---

## 5. Builder: buyer profile for fiscal invoices

**Navigation:** Profile → **Edit profile**

| Field | Purpose |
|-------|---------|
| KRA PIN | Maps to `customerPin` on B2B invoices |
| Billing / company name | Maps to `customerName` |

If the builder has no KRA PIN, TIS may still submit with buyer name only, depending on KRA sandbox rules for B2C sales. B2B transactions should always include a valid buyer PIN.

---

## 6. Purchase order → fiscal invoice flow

TIS submits **`POST /invoices`** from a **purchase order**, not from a separate internal invoice module.

### 6.1 Automatic submission paths

| User action | Result |
|-------------|--------|
| **Cart → Buy Now** | PO created with status `confirmed` → automatic TIS submit |
| **Materials grid → Buy Now** | Same as above |

### 6.2 Manual submission paths

| User action | Result |
|-------------|--------|
| **Supplier Order Management** | Supplier clicks **Submit to KRA eTIMS** on an accepted PO |
| **Admin TIS / eTIMS tools** | Staff retry or test submit on a specific PO |

### 6.3 Quote workflow

POs in quote-pending statuses (`quote_created`, `quote_received_by_supplier`, `quoted`, etc.) **block** automatic submission. After the builder accepts the quote and the PO reaches an accepted/confirmed status, the supplier or admin may submit manually.

### 6.4 Gates (submission blocked if any fail)

| Gate | Error stored on |
|------|-----------------|
| Missing or invalid supplier KRA PIN / legal name | `purchase_orders.etims_error` |
| PO still in draft, pending, or quote status | Same |
| PO line missing `etims_item_code` | Same |
| eTIMS proxy not configured | Same |

### 6.5 Successful submission outcome

On success, the platform stores on the PO:

- `etims_validated_at` — timestamp of KRA acceptance  
- `etims_response` — JSON snapshot (verification URL, SCU reference)  
- Entry in `tis_submission_log` — audit trail  

The buyer and supplier can then open the **fiscal receipt view**.

---

## 7. Viewing the fiscal receipt and QR code

**Component:** `EtimsFiscalReceiptView`

After a successful KRA response, the fiscal receipt displays:

| Element | Description |
|---------|-------------|
| Issuer name and KRA PIN | Supplier taxpayer |
| Trader invoice number | PO number (`traderInvoiceNo`) |
| SCU / control unit fields | From KRA response |
| Line items and totals | From PO |
| **Verification URL** | KRA public validation link |
| **QR code** | Encodes verification URL for mobile scanning |

**Operator action:** Confirm the QR code scans correctly and opens the KRA verification page during sandbox certification.

---

## 8. Credit notes

Credit notes reverse or adjust a prior sale.

| Requirement | Detail |
|-------------|--------|
| Prior sale | PO must have a successful eTIMS sale (`etims_validated_at` set) |
| Receipt type | `receiptTypeCode: R` |
| Reference | `traderOrgInvoiceNo` links to original sale invoice number |
| Endpoint | Same `POST /invoices` via `etims-proxy` |

**Supplier action:** Use the credit note action on the supplier invoice hub for the original PO (when enabled after sandbox assignment).

---

## 9. Administrator: TIS Integrator Hub

**Navigation:** Admin dashboard → **TIS Integrator** tab  
**Component:** `TisIntegratorHub`

The hub has four sub-tabs:

| Tab | Purpose |
|-----|---------|
| **Platform & certification** | Integrator metadata, environment status, KRA certification checklist |
| **Vendor onboarding** | Per-supplier onboarding lifecycle |
| **Submission ops** | Monitor and retry failed PO submissions |
| **Integrator API** | Allowlisted REST calls to KRA sandbox (items, customers, reference data) |

This hub is separate from the **eTIMS test** tab, which is used for low-level proxy smoke tests.

---

## 10. Administrator: vendor onboarding

**Table:** `tis_vendor_onboarding`  
**Panel:** `TisVendorOnboardingPanel`

### 10.1 Lifecycle states

```
draft → pending_review → pending_kra → active
              ↓
           rejected
active ↔ suspended
```

| Status | Meaning |
|--------|---------|
| `draft` | Supplier profile incomplete |
| `pending_review` | Awaiting admin review of tax identity and catalog |
| `pending_kra` | Awaiting OSCU init, item registration, or KRA steps |
| `active` | Cleared for sandbox/production invoicing |
| `suspended` | Temporarily blocked |
| `rejected` | Not approved for TIS |

### 10.2 Admin procedure

1. Open **Vendor onboarding** in the TIS Integrator Hub.
2. Review supplier KRA PIN, legal name, branch, and device serial.
3. Advance status to `pending_kra` when internal review passes.
4. Complete OSCU initialization (§12) and item registration.
5. Set status to `active` before the supplier’s first live sandbox invoice.

---

## 11. Administrator: submission operations and retry

**Panel:** `TisSubmissionOpsPanel`  
**Audit table:** `tis_submission_log`

### 11.1 Monitoring

| Data source | What to check |
|-------------|---------------|
| `tis_submission_log` | Per-submission status, error message, response snapshot |
| `purchase_orders.etims_error` | Latest failure on a specific order |
| `purchase_orders.etims_validated_at` | Confirms successful fiscalisation |

### 11.2 Retry procedure

1. Open **Submission ops** or the admin PO submit card (`EtimsPurchaseOrderSubmitCard`).
2. Identify POs with `etims_error` populated and no `etims_validated_at`.
3. Fix the root cause (missing item code, invalid PIN, wrong PO status).
4. Click **Submit to KRA eTIMS** or **Retry**.
5. Confirm a new `tis_submission_log` entry with status `success`.

---

## 12. Administrator: OSCU initialization

**Library:** `tisOscuInitialization.ts`  
**KRA endpoint:** `POST selectInitOsdcInfo` (via `etims-proxy`)

### 12.1 Required inputs

| Field | Description |
|-------|-------------|
| `tin` | Vendor/supplier KRA PIN |
| `bhfId` | Branch office code (e.g. `00`) |
| `dvcSrlNo` | KRA-assigned device serial for sandbox |

### 12.2 Procedure

1. Ensure Edge secrets point to KRA sandbox (`ETIMS_BASE_URL=https://etims-api-sbx.kra.go.ke`).
2. Open **Integrator API** or the OSCU initialization form in the admin hub.
3. Enter supplier PIN, branch, and device serial.
4. Submit — KRA returns `cmcKey`, `dvcId`, and branch name.
5. Store device ID on the supplier record; **never** store communication keys in plain text in the database.

---

## 13. Administrator: Integrator API console

**Panel:** `TisIntegratorApiConsole`

Used during sandbox certification for:

| Operation | Typical path |
|-----------|--------------|
| Reference data sync | GET endpoints (countries, tax codes, item classes) |
| Item registration | `POST /items` |
| Customer registration | `POST /customers` |
| Manual invoice test | `POST /invoices` |

All paths must appear on the allowlist in `supabase/functions/_shared/etimsPathAllowlist.ts`. Requests exceeding 400 KB are rejected.

---

## 14. Common errors and resolution

| Symptom | Likely cause | Resolution |
|---------|--------------|------------|
| “eTIMS proxy not configured” | Edge secrets missing | Admin: set `ETIMS_BASE_URL`, `ETIMS_BASIC_USER`, `ETIMS_BASIC_PASSWORD` |
| “Invalid KRA PIN” | PIN format or mismatch | Supplier: correct PIN in KRA settings |
| “Missing item code on line …” | Catalog not mapped | Admin/supplier: set `etims_item_code` on product |
| “PO status blocks submission” | Quote not accepted | Complete quote workflow first |
| HTTP 403 from proxy | User lacks role | Assign `supplier`, `admin`, or `super_admin` |
| KRA rejection on `/invoices` | Payload or master data | Check SalesReq mapping; register items/customers on sandbox |

---

## 15. Support and escalation

| Level | Contact |
|-------|---------|
| End-user (supplier/builder) | UjenziXform platform support — _[Complete before submission]_ |
| TIS / integrator technical | UjenziXform Solution — Barngetuny Plaza Left Wing 3rd Floor Room 10, Ronald Ngala Street, Eldoret. P. O. Box 4146 - 30100 Eldoret |
| KRA eTIMS | eTIMS portal and integrator certification unit |

For certification testing, administrators should retain screenshots of successful submissions, fiscal receipts with QR codes, and `tis_submission_log` entries as evidence.

---

## 16. Document control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-03 | Initial release for KRA optical disk submission |

**Related documents:**

- `TIS_ETIMS_INTEGRATION_ARCHITECTURE.md` — full technical architecture  
- `INSTALLATION_DEPLOYMENT_GUIDE.md` — deployment and Edge configuration  
- `CERTIFICATION_TEST_PLAN.md` — sandbox test cases  

