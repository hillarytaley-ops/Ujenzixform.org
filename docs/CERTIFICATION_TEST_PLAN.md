# UjenziXform TIS — KRA eTIMS Certification Test Plan

**Document type:** Certification test plan (sandbox testing)  
**Applicant:** UjenziXform Solution  
**Product:** UjenziXform Trader Invoicing System (TIS) v1.0.0  
**Solution type:** OSCU (Online Sales Control Unit)  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Document version:** 1.0  
**Date:** 3 June 2026  

> **Prerequisite:** KRA-assigned sandbox credentials at `https://etims-api-sbx.kra.go.ke`  
> **Current status:** Test plan prepared; execution **pending sandbox assignment**.

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Test environment](#2-test-environment)
3. [Test roles and accounts](#3-test-roles-and-accounts)
4. [Entry criteria](#4-entry-criteria)
5. [Exit criteria](#5-exit-criteria)
6. [Test case summary](#6-test-case-summary)
7. [Detailed test cases](#7-detailed-test-cases)
8. [Evidence and deliverables](#8-evidence-and-deliverables)
9. [Defect management](#9-defect-management)
10. [Certification checklist mapping](#10-certification-checklist-mapping)
11. [Sign-off](#11-sign-off)
12. [Document control](#12-document-control)

---

## 1. Purpose and scope

This document defines the **sandbox test cases** UjenziXform will execute to validate the **Trader Invoicing System (TIS)** against KRA eTIMS OSCU requirements before requesting integrator certification.

### 1.1 In scope

- OSCU device initialization  
- Reference data and master data sync  
- Item and customer registration  
- Sales invoice submission (`POST /invoices`, type **S**)  
- Credit note submission (`POST /invoices`, type **R**)  
- Fiscal receipt and QR verification UI  
- Multi-vendor (per-supplier PIN) invoicing  
- Submission audit, error handling, and retry  
- Security controls (credential isolation, JWT, allowlist)  

### 1.2 Out of scope (initial certification round)

- Production cutover to `https://etims-api.kra.go.ke`  
- VSCU-only deployments (OSCU is primary; VSCU paths supported in code but not primary test focus)  
- Non-TIS marketplace features (Paystack, delivery, SMS)  

---

## 2. Test environment

| Item | Value |
|------|--------|
| Platform | UjenziXform staging / sandbox deployment |
| KRA API | `https://etims-api-sbx.kra.go.ke` |
| API gateway | Supabase Edge `etims-proxy` |
| Database | Supabase PostgreSQL (staging project) |
| Frontend | HTTPS-hosted React app |
| Credentials | `ETIMS_BASIC_USER`, `ETIMS_BASIC_PASSWORD` in Edge secrets |

### 2.1 Pre-test configuration

| Step | Action | Owner |
|------|--------|-------|
| 1 | Deploy `etims-proxy` to staging Supabase | DevOps |
| 2 | Set Edge secrets with KRA sandbox credentials | DevOps |
| 3 | Apply all TIS migrations | DevOps |
| 4 | Create test supplier with sandbox PIN | Admin |
| 5 | Create test builder with sandbox PIN | Admin |
| 6 | Register test catalog items with KRA item codes | Admin |

---

## 3. Test roles and accounts

| Account | Role | Used for |
|---------|------|----------|
| `admin@test.ujenzixform.org` | `admin` | Integrator Hub, OSCU init, submission ops |
| `supplier-a@test.ujenzixform.org` | `supplier` | Vendor A sandbox PIN, manual submit |
| `supplier-b@test.ujenzixform.org` | `supplier` | Vendor B — multi-vendor test |
| `builder@test.ujenzixform.org` | `builder` | Buyer PIN, receipt verification |
| Unauthenticated | — | Negative security tests |

Replace with actual test accounts created in the staging environment. Document KRA sandbox PINs in a **separate confidential annex** — not on the optical disk.

---

## 4. Entry criteria

All must be true before test execution begins:

| # | Criterion |
|---|-----------|
| E1 | KRA sandbox credentials received and configured in Edge secrets |
| E2 | `etims-proxy` deployed and returns non-503 on configured environment |
| E3 | TIS database migrations applied |
| E4 | At least one test supplier with valid sandbox PIN, branch, device serial |
| E5 | Test catalog items mapped to valid KRA `etims_item_code` values |
| E6 | Certification test plan approved internally |
| E7 | This test plan submitted to KRA (on optical disk) prior to certification |

---

## 5. Exit criteria

Sandbox certification round is complete when:

| # | Criterion |
|---|-----------|
| X1 | All **Priority 1** test cases pass |
| X2 | No open **Critical** or **High** defects |
| X3 | Evidence pack assembled (§8) |
| X4 | Admin certification checklist in TIS Integrator Hub ≥ 100% for sandbox items |
| X5 | Results submitted to KRA integrator certification unit |
| X6 | KRA written approval received before production cutover |

---

## 6. Test case summary

| ID | Category | Test case | Priority |
|----|----------|-----------|----------|
| TC-01 | Security | Proxy rejects unauthenticated request | P1 |
| TC-02 | Security | Proxy rejects disallowed REST path | P1 |
| TC-03 | Security | Credentials not exposed to browser | P1 |
| TC-04 | Init | OSCU initialization (`selectInitOsdcInfo`) | P1 |
| TC-05 | Master data | Reference data GET (tax codes, item classes) | P2 |
| TC-06 | Master data | Register item (`POST /items`) | P1 |
| TC-07 | Master data | Register customer (`POST /customers`) | P2 |
| TC-08 | Transaction | Sales invoice from Cart Buy Now (type S) | P1 |
| TC-09 | Transaction | Sales invoice from supplier manual submit | P1 |
| TC-10 | Transaction | Sales invoice — multi-vendor (two supplier PINs) | P1 |
| TC-11 | Transaction | Credit note (type R) linked to prior sale | P1 |
| TC-12 | UI | Fiscal receipt displays verification URL and QR | P1 |
| TC-13 | UI | QR code resolves on KRA public verification page | P1 |
| TC-14 | Negative | Block submit when PO in quote status | P2 |
| TC-15 | Negative | Block submit when line missing item code | P2 |
| TC-16 | Negative | Block submit when supplier PIN invalid | P2 |
| TC-17 | Operations | Failed submit logged in `tis_submission_log` | P1 |
| TC-18 | Operations | Admin retry succeeds after fixing error | P1 |
| TC-19 | Onboarding | Vendor lifecycle draft → active | P2 |
| TC-20 | Payload | SalesReq field mapping matches KRA spec | P1 |

**Priority:** P1 = mandatory for certification; P2 = required where applicable to integrator scope.

---

## 7. Detailed test cases

### TC-01 — Proxy rejects unauthenticated request

| Field | Detail |
|-------|--------|
| **Objective** | Verify JWT required |
| **Steps** | POST to `etims-proxy` without Authorization header |
| **Expected** | HTTP 401; no upstream KRA call |
| **Evidence** | Network log / Edge function log |

### TC-02 — Proxy rejects disallowed REST path

| Field | Detail |
|-------|--------|
| **Objective** | Verify SSRF allowlist |
| **Steps** | Invoke proxy with `path: "../../../evil"` or non-allowlisted path |
| **Expected** | HTTP 400; path rejected |
| **Evidence** | Response body error message |

### TC-03 — Credentials not exposed to browser

| Field | Detail |
|-------|--------|
| **Objective** | Verify credential isolation |
| **Steps** | Inspect browser Network tab, page source, and local storage during TIS operations |
| **Expected** | No `ETIMS_BASIC_USER`, `ETIMS_BASIC_PASSWORD`, or `cmcKey` in client |
| **Evidence** | Screenshot of Network tab |

### TC-04 — OSCU initialization

| Field | Detail |
|-------|--------|
| **Objective** | Device setup on KRA sandbox |
| **Preconditions** | KRA sandbox PIN, branch `bhfId`, device serial `dvcSrlNo` |
| **Steps** | Admin → TIS Integrator Hub → run OSCU init with test supplier PIN |
| **Expected** | Success response with `dvcId`; supplier record updated; key not stored plain text |
| **Evidence** | Screenshot; `tis_submission_log` or init audit row |

### TC-05 — Reference data sync

| Field | Detail |
|-------|--------|
| **Objective** | Verify allowlisted GET endpoints |
| **Steps** | Admin → Integrator API console → fetch tax type codes or item classification codes |
| **Expected** | HTTP 200; JSON reference data returned |
| **Evidence** | API console response screenshot |

### TC-06 — Item registration

| Field | Detail |
|-------|--------|
| **Objective** | Register catalog item on KRA sandbox |
| **Steps** | POST /items for test product with valid item class and tax code |
| **Expected** | Item accepted on KRA sandbox; code usable on invoice lines |
| **Evidence** | Request/response log (PINs redacted) |

### TC-07 — Customer registration

| Field | Detail |
|-------|--------|
| **Objective** | Register B2B buyer on sandbox |
| **Steps** | POST /customers with builder sandbox PIN |
| **Expected** | Customer registered; usable as `customerPin` on invoice |
| **Evidence** | Request/response log |

### TC-08 — Sales invoice from Cart Buy Now

| Field | Detail |
|-------|--------|
| **Objective** | End-to-end automatic fiscalisation |
| **Preconditions** | Supplier A active; items coded; builder profile complete |
| **Steps** | Builder → Cart → Buy Now → confirm order |
| **Expected** | PO `confirmed`; `POST /invoices` succeeds; `etims_validated_at` set |
| **Evidence** | PO detail screenshot; `tis_submission_log` success row |

### TC-09 — Sales invoice from supplier manual submit

| Field | Detail |
|-------|--------|
| **Objective** | Supplier-triggered submission |
| **Preconditions** | Accepted PO not yet fiscalised |
| **Steps** | Supplier → Order Management → Submit to KRA eTIMS |
| **Expected** | Same as TC-08 |
| **Evidence** | Supplier dashboard screenshot |

### TC-10 — Multi-vendor invoicing

| Field | Detail |
|-------|--------|
| **Objective** | Each invoice uses supplier PIN as `traderTin` |
| **Preconditions** | Supplier A and Supplier B both active with different PINs |
| **Steps** | Create and submit PO for each supplier |
| **Expected** | Invoice 1 `traderTin` = PIN A; Invoice 2 `traderTin` = PIN B |
| **Evidence** | Two SalesReq payloads (from logs) with distinct `traderTin` |

### TC-11 — Credit note

| Field | Detail |
|-------|--------|
| **Objective** | Reverse prior sale |
| **Preconditions** | TC-08 or TC-09 completed successfully |
| **Steps** | Supplier → issue credit note on same PO |
| **Expected** | `receiptTypeCode: R`; `traderOrgInvoiceNo` references original; KRA accepts |
| **Evidence** | Credit note receipt; log entry |

### TC-12 — Fiscal receipt UI

| Field | Detail |
|-------|--------|
| **Objective** | Receipt displays required fields |
| **Preconditions** | Successful sale |
| **Steps** | Builder and supplier open fiscal receipt view |
| **Expected** | Issuer PIN, invoice number, lines, totals, verification URL visible |
| **Evidence** | Screenshot of `EtimsFiscalReceiptView` |

### TC-13 — QR verification

| Field | Detail |
|-------|--------|
| **Objective** | Public KRA validation works |
| **Steps** | Scan QR from TC-12 with mobile device |
| **Expected** | KRA verification page opens and confirms invoice |
| **Evidence** | Photo or screenshot of verification result |

### TC-14 — Block quote-pending PO

| Field | Detail |
|-------|--------|
| **Objective** | Status gate enforced |
| **Steps** | Attempt submit on PO in `quote_created` status |
| **Expected** | No KRA call; `etims_error` explains blocked status |
| **Evidence** | PO error message screenshot |

### TC-15 — Block missing item code

| Field | Detail |
|-------|--------|
| **Objective** | Catalog gate enforced |
| **Steps** | Create PO line without `etims_item_code`; attempt submit |
| **Expected** | Submission blocked with item code error |
| **Evidence** | Error on PO |

### TC-16 — Block invalid supplier PIN

| Field | Detail |
|-------|--------|
| **Objective** | PIN validation enforced |
| **Steps** | Set invalid PIN on supplier; attempt checkout or submit |
| **Expected** | Blocked before or at submit with PIN error |
| **Evidence** | Validation message screenshot |

### TC-17 — Audit log on failure

| Field | Detail |
|-------|--------|
| **Objective** | Failures recorded |
| **Steps** | Trigger a controlled KRA rejection (e.g. bad test payload via API console) |
| **Expected** | `tis_submission_log` row with status `failed` and error detail |
| **Evidence** | Admin Submission ops screenshot |

### TC-18 — Admin retry after fix

| Field | Detail |
|-------|--------|
| **Objective** | Retry path works |
| **Preconditions** | TC-15 failure; admin adds missing item code |
| **Steps** | Admin → retry submit on same PO |
| **Expected** | Success; prior error cleared |
| **Evidence** | Before/after PO state |

### TC-19 — Vendor onboarding lifecycle

| Field | Detail |
|-------|--------|
| **Objective** | Onboarding workflow operational |
| **Steps** | Move test vendor through draft → pending_review → pending_kra → active |
| **Expected** | Status transitions logged; active vendor can submit |
| **Evidence** | Onboarding panel screenshots |

### TC-20 — SalesReq payload mapping

| Field | Detail |
|-------|--------|
| **Objective** | Field mapping matches architecture and KRA spec |
| **Steps** | Capture SalesReq JSON from successful TC-08 |
| **Expected** | See mapping table below |
| **Evidence** | Redacted JSON attached to test report |

**Expected mapping (sample):**

| KRA field | UjenziXform source |
|-----------|-------------------|
| `traderInvoiceNo` | PO number |
| `traderTin` | Supplier `kra_pin` |
| `traderName` | Supplier legal name |
| `customerPin` | Builder `profiles.kra_pin` |
| `receiptTypeCode` | `S` (sale) |
| `salesItems[].itemCode` | Catalog `etims_item_code` |
| `salesDate` | `yyyyMMddHHmmss` at submission |

Reference payload: `appendix/APPENDIX_SAMPLE_SALESREQ.json`

---

## 8. Evidence and deliverables

For each **P1** test case, record:

| Artifact | Format |
|----------|--------|
| Test execution log | Spreadsheet or PDF |
| Screenshots | PNG (UI, receipt, QR verification) |
| Request/response samples | JSON with PINs and keys redacted |
| `tis_submission_log` export | CSV for test date range |
| Certification checklist | Export from TIS Integrator Hub |

**Deliver to KRA:**

1. Completed test execution log with pass/fail per case  
2. Evidence pack (zip or PDF) referenced by log  
3. Updated architecture document if mapping changes during testing  
4. Written request for production certification after all P1 cases pass  

---

## 9. Defect management

| Severity | Definition | Certification impact |
|----------|------------|----------------------|
| **Critical** | Data loss, credential exposure, incorrect tax submission | Blocks certification |
| **High** | P1 test case fails; no workaround | Blocks certification |
| **Medium** | P2 failure or workaround exists | Document; fix before production |
| **Low** | Cosmetic UI issue | Document; fix in next release |

Defects logged with: ID, test case, steps, expected, actual, severity, status.

---

## 10. Certification checklist mapping

Tests map to the in-app checklist (`TIS_INTEGRATOR_CHECKLIST`):

| Checklist ID | Test cases |
|--------------|------------|
| `platform_registered` | Pre-test (eTIMS portal) |
| `sandbox_access` | E1, TC-04 |
| `oscu_vscu_init` | TC-04 |
| `master_data_sync` | TC-05 |
| `item_registration` | TC-06 |
| `customer_registration` | TC-07 |
| `sales_invoice` | TC-08, TC-09, TC-20 |
| `credit_note` | TC-11 |
| `fiscal_receipt_ui` | TC-12, TC-13 |
| `vendor_tis_identity` | TC-10 |
| `vendor_onboarding_workflow` | TC-19 |
| `submission_audit` | TC-17, TC-18 |
| `secure_credentials` | TC-01, TC-02, TC-03 |
| `production_cutover` | Post-certification (out of scope) |

---

## 11. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Test lead | _[Complete before execution]_ | | |
| Technical lead | _[Complete before execution]_ | | |
| Authorised signatory | _[Complete before submission]_ | | |

**Sandbox test execution date range:** _[To be completed after KRA assigns sandbox]_

**Overall result:** _[ Pass / Fail — pending ]_

---

## 12. Document control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-03 | Initial test plan for KRA optical disk submission |

**Related documents:**

- `TIS_ETIMS_INTEGRATION_ARCHITECTURE.md` — §23 checklist mapping  
- `USER_OPERATOR_MANUAL.md` — operator procedures under test  
- `INSTALLATION_DEPLOYMENT_GUIDE.md` — environment setup  
- `appendix/APPENDIX_SAMPLE_SALESREQ.md` — sample payload  
