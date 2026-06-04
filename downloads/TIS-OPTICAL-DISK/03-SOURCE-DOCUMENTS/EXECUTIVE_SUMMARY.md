# Executive Summary — UjenziXform TIS ↔ KRA eTIMS Integration

**Document:** Technology Architecture (companion to `TIS_ETIMS_INTEGRATION_ARCHITECTURE.md`)  
**Applicant:** UjenziXform Solution  
**Registered address:** Barngetuny Plaza Left Wing 3rd Floor Room 10, Ronald Ngala Street, Eldoret. P. O. Box 4146 - 30100 Eldoret  
**Product:** UjenziXform Trader Invoicing System (TIS) v1.0.0  
**Solution type:** OSCU  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Date:** 3 June 2026  

---

## Purpose of submission

UjenziXform applies to KRA as a **potential third-party TIS integrator** and requests **eTIMS sandbox access** (`https://etims-api-sbx.kra.go.ke`). This pack explains **how our Trader Invoicing System will integrate with KRA eTIMS** once sandbox credentials are issued. We do not yet hold sandbox access or integrator certification.

---

## What UjenziXform is

UjenziXform is a **construction materials marketplace** in Kenya. Builders purchase from suppliers via **purchase orders (POs)**. TIS is the **eTIMS compliance layer** on those orders — not a separate accounting product. The KRA fiscal response on each PO becomes the **tax receipt** (with verification URL and QR code) shown to buyers and suppliers.

---

## Integration in one paragraph

When a qualifying PO is confirmed, TIS maps order lines and tax identity to KRA **SalesReq** JSON and sends **`POST /invoices`** through a server-side gateway (`etims-proxy` on Supabase Edge). KRA returns SCU data and a verification URL; UjenziXform stores the response on the PO and displays a fiscal receipt. Each invoice carries the **supplier’s KRA PIN** as the issuing taxpayer (`traderTin`). UjenziXform provides the integrator software and secure channel; **suppliers remain the fiscal issuers**.

---

## Architecture at a glance

```
Builder / Supplier / Admin  →  UjenziXform web app  →  purchaseOrderEtims
       →  etims-proxy (JWT, allowlist, Edge secrets)  →  KRA eTIMS sandbox  →  OSCU
```

| Layer | Component |
|-------|-----------|
| Business | Purchase orders, supplier/buyer tax identity, catalog item codes |
| Application | `purchaseOrderEtims.ts` — PO → SalesReq |
| Integration | `etims-proxy` — HTTPS + KRA credentials, path allowlist |
| Compliance UI | Fiscal receipt + QR (`EtimsFiscalReceiptView`) |
| Audit | `tis_submission_log`, `purchase_orders.etims_*` |

---

## Key flows (upon sandbox assignment)

| Flow | Endpoint | Purpose |
|------|----------|---------|
| OSCU initialization | `POST selectInitOsdcInfo` | Device setup (`tin`, `bhfId`, `dvcSrlNo`) |
| Sales invoice | `POST /invoices` (type **S**) | Fiscalise supplier sale from PO |
| Credit note | `POST /invoices` (type **R**) | Reverse/adjust prior sale |
| Master data | `POST /items`, `POST /customers`, GET reference codes | Catalog and buyer registration |

**Purchase trigger (current design):** Cart Buy Now, Materials Buy Now, supplier manual submit, admin retry — all from an **accepted/confirmed PO** with valid supplier KRA PIN and line item codes.

---

## Security summary

- KRA credentials stored **only** in Supabase Edge secrets — never in browser or database  
- Every API call: authenticated user JWT + role check (`supplier`, `admin`, `super_admin`)  
- Strict REST path allowlist (SSRF protection)  
- OSCU communication keys redacted in audit logs  
- Row Level Security on TIS admin and onboarding tables  

---

## Multi-vendor model

One UjenziXform integrator registration serves **many supplier taxpayers** on the marketplace. Vendor onboarding (`tis_vendor_onboarding`), per-supplier KRA PIN, branch, device serial, and catalog metadata are tracked before sandbox invoicing.

---

## Readiness and next steps

| Item | Status |
|------|--------|
| TIS application software (proxy, mapping, receipt UI, audit) | **Ready for sandbox testing** |
| KRA sandbox credentials | **Pending — subject of this application** |
| Integrator certification | **Pending — after sandbox test cases** |
| Production eTIMS | **Future — after KRA approval** |

**After sandbox assignment:** configure Edge secrets → OSCU init → register test items → run sales/credit note tests → complete certification checklist → submit results to KRA.

---

## Enclosed documents

1. `KRA_TIS_COVER_LETTER` — sandbox access request  
2. `TIS_ETIMS_INTEGRATION_ARCHITECTURE` — full architecture (v3.3)  
3. `APPENDIX_SAMPLE_SALESREQ` — anonymised request/response examples  
4. `flows/` — diagram pack  
5. `USER_OPERATOR_MANUAL` — supplier, builder, and admin procedures  
6. `INSTALLATION_DEPLOYMENT_GUIDE` — deployment and Edge configuration  
7. `CERTIFICATION_TEST_PLAN` — sandbox test cases (pending execution)  

