# UjenziXform TIS — Installation & Deployment Guide

**Document type:** Installation and deployment guide (certification submission)  
**Applicant:** UjenziXform Solution  
**Product:** UjenziXform Trader Invoicing System (TIS) v1.0.0  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Document version:** 1.0  
**Date:** 3 June 2026  

> **Status:** Applicant / in development — production eTIMS cutover only after KRA certification.

---

## Table of contents

1. [Scope](#1-scope)
2. [System requirements](#2-system-requirements)
3. [Architecture overview](#3-architecture-overview)
4. [Software components](#4-software-components)
5. [Development environment setup](#5-development-environment-setup)
6. [Database migrations](#6-database-migrations)
7. [Supabase Edge Function deployment](#7-supabase-edge-function-deployment)
8. [eTIMS / KRA credential configuration](#8-etims--kra-credential-configuration)
9. [Frontend deployment](#9-frontend-deployment)
10. [Post-deployment verification](#10-post-deployment-verification)
11. [Sandbox vs production environments](#11-sandbox-vs-production-environments)
12. [Security checklist](#12-security-checklist)
13. [Optical disk software bundle](#13-optical-disk-software-bundle)
14. [Document control](#14-document-control)

---

## 1. Scope

This guide covers installation and deployment of the **UjenziXform Trader Invoicing System (TIS)** — the eTIMS integration layer within the UjenziXform platform.

It is intended for:

- UjenziXform technical staff deploying sandbox or production environments  
- KRA reviewers verifying how TIS software is installed and configured  

This guide does **not** cover general UjenziXform marketplace features unrelated to eTIMS (payments, delivery, messaging).

---

## 2. System requirements

### 2.1 Runtime stack

| Layer | Technology | Minimum version |
|-------|------------|-----------------|
| Frontend | React, TypeScript, Vite | Node.js 18+ |
| Backend | Supabase (PostgreSQL, Auth, RLS) | Supabase project |
| API gateway | Supabase Edge Functions (Deno) | `etims-proxy` deployed |
| Hosting | Vercel or equivalent static host | HTTPS required |

### 2.2 External services

| Service | Purpose |
|---------|---------|
| KRA eTIMS API | Fiscal invoice submission (sandbox or production) |
| Supabase Dashboard | Edge secrets, migrations, auth |

### 2.3 Operator access

| Role | Required for |
|------|--------------|
| Supabase project admin | Deploy Edge functions, set secrets, run migrations |
| Vercel (or host) admin | Deploy frontend, set public env vars |
| eTIMS portal account | Integrator registration and sandbox credential request |

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React)                                            │
│  src/lib/etims/*  →  invokeEtimsProxy.ts                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + Supabase JWT
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge: etims-proxy                                 │
│  JWT auth · role check · path allowlist · HTTP Basic auth   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  KRA eTIMS API                                              │
│  Sandbox: https://etims-api-sbx.kra.go.ke                    │
│  Production: https://etims-api.kra.go.ke (post-certification)│
└─────────────────────────────────────────────────────────────┘
```

KRA credentials (`ETIMS_BASIC_USER`, `ETIMS_BASIC_PASSWORD`) exist **only** in Supabase Edge secrets. They are never committed to git, never stored in PostgreSQL, and never exposed to the browser.

---

## 4. Software components

### 4.1 TIS integration source (included on optical disk)

| Path | Description |
|------|-------------|
| `src/lib/etims/` | Core TIS library (PO mapping, OSCU init, audit) |
| `src/components/admin/tis-integrator/` | Admin TIS Integrator Hub |
| `src/components/etims/` | Fiscal receipt UI |
| `src/components/admin/Etims*.tsx` | Admin test and PO submit panels |
| `src/components/supplier/SupplierEtimsSettingsPanel.tsx` | Supplier KRA settings |
| `supabase/functions/etims-proxy/` | Secure KRA API gateway |
| `supabase/functions/_shared/etimsPathAllowlist.ts` | SSRF path allowlist |
| `supabase/migrations/*etims*` / `*tis*` | Database schema for TIS |

### 4.2 Key entry points

| Function | File |
|----------|------|
| Build SalesReq from PO | `src/lib/etims/purchaseOrderEtims.ts` |
| Submit PO to eTIMS | `submitEtimsInvoiceForPurchaseOrder()` |
| OSCU initialization | `src/lib/etims/tisOscuInitialization.ts` |
| Audit logging | `src/lib/etims/logTisSubmission.ts` |
| Proxy invocation | `src/lib/etims/invokeEtimsProxy.ts` |

---

## 5. Development environment setup

### 5.1 Clone and install

```bash
git clone <repository-url>
cd UjenziXform
npm install
```

### 5.2 Environment file

Copy the template and configure public variables only:

```bash
cp env.local.template .env.local
```

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key — safe for browser |

**Do not** put `ETIMS_BASIC_USER` or `ETIMS_BASIC_PASSWORD` in `.env.local`. These belong in Supabase Edge secrets only.

### 5.3 Start development server

```bash
npm run dev
```

Default Vite dev server: `http://localhost:5173`

### 5.4 Run tests

```bash
npm run test:run
```

TIS-related unit tests include `purchaseOrderEtims.test.ts`, `formatEtimsReceiptForUi.test.ts`, and `kraPin.test.ts`.

---

## 6. Database migrations

TIS requires PostgreSQL tables and RLS policies created by Supabase migrations.

### 6.1 Key migrations

| Migration | Purpose |
|-----------|---------|
| `20260516180000_kra_etims_profiles_suppliers_products.sql` | Supplier/buyer tax fields, item codes |
| `20260525120000_tis_integrator_platform.sql` | Integrator platform metadata, checklist |
| `20260525130000_fix_tis_integrator_rls_roles.sql` | RLS for TIS admin tables |
| `20260525140000_tis_onboarding_init_audit.sql` | Vendor onboarding, init audit |
| PO `etims_*` column migrations | Fiscal outcome on purchase orders |

### 6.2 Apply migrations

**Option A — Supabase CLI (linked project):**

```bash
supabase db push
```

**Option B — Supabase Dashboard:**

1. Open **SQL Editor**.
2. Run migration SQL files in chronological order from `supabase/migrations/`.

### 6.3 Verify tables

Confirm these tables exist:

- `tis_integrator_platform`
- `tis_vendor_onboarding`
- `tis_submission_log`
- `purchase_orders` with columns `etims_validated_at`, `etims_response`, `etims_error`

---

## 7. Supabase Edge Function deployment

### 7.1 Deploy etims-proxy

```bash
supabase functions deploy etims-proxy
```

### 7.2 Function behaviour

| Control | Implementation |
|---------|----------------|
| HTTP method | POST only (OPTIONS for CORS) |
| Authentication | Valid Supabase JWT required |
| Authorization | Roles: `supplier`, `admin`, `super_admin` |
| Path validation | Allowlist in `etimsPathAllowlist.ts` |
| Body size limit | 400 KB maximum |
| Upstream auth | HTTP Basic using Edge secrets |

### 7.3 Invoke format

```json
{
  "method": "POST",
  "path": "invoices",
  "body": { "... SalesReq JSON ..." }
}
```

The Edge function calls `{ETIMS_BASE_URL}/{path}` with the configured Basic credentials.

---

## 8. eTIMS / KRA credential configuration

### 8.1 Edge secrets (Supabase Dashboard)

Navigate to: **Project Settings → Edge Functions → Secrets**

| Secret | Sandbox value (after KRA assignment) | Production value |
|--------|--------------------------------------|------------------|
| `ETIMS_BASE_URL` | `https://etims-api-sbx.kra.go.ke` | `https://etims-api.kra.go.ke` |
| `ETIMS_BASIC_USER` | Issued by KRA | Issued by KRA |
| `ETIMS_BASIC_PASSWORD` | Issued by KRA | Issued by KRA |

**Rules:**

- No trailing slash on `ETIMS_BASE_URL`
- URL must start with `http://` or `https://`
- Rotate credentials if compromised; never log passwords

### 8.2 Platform certification status

In the admin **TIS Integrator Hub → Platform & certification** panel, set:

| Field | Sandbox testing |
|-------|-----------------|
| Environment | `sandbox_testing` |
| Base URL reference | `https://etims-api-sbx.kra.go.ke` |

Update to `certified` and production URL only after formal KRA approval.

### 8.3 Verify configuration

1. Sign in as admin.
2. Open Admin dashboard → **eTIMS test** tab.
3. Run a connection test or invoke a safe GET reference-data path.
4. Expected: HTTP 200 from KRA sandbox (not 503 “proxy not configured”).

---

## 9. Frontend deployment

### 9.1 Build

```bash
npm run build
```

Output directory: `dist/`

### 9.2 Host environment variables

Set on Vercel (or equivalent) for **Production** and **Preview**:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

Redeploy after changing environment variables.

### 9.3 CORS

The `etims-proxy` Edge function returns CORS headers for browser invocation. Ensure the Supabase project URL matches the deployed frontend’s configured Supabase client.

---

## 10. Post-deployment verification

Run this checklist after each deployment to a new environment:

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | Edge secrets set | No 503 from `etims-proxy` |
| 2 | Migrations applied | TIS tables queryable |
| 3 | Admin TIS Integrator Hub loads | Four sub-tabs visible |
| 4 | Supplier KRA settings save | `suppliers.kra_pin` persisted |
| 5 | Test PO submit (sandbox) | `etims_validated_at` set; receipt displays QR |
| 6 | Audit log | Row in `tis_submission_log` |
| 7 | Secrets scan | No credentials in git or optical disk bundle |

---

## 11. Sandbox vs production environments

| Aspect | Sandbox | Production |
|--------|---------|------------|
| KRA base URL | `https://etims-api-sbx.kra.go.ke` | `https://etims-api.kra.go.ke` |
| Credentials | KRA sandbox Basic auth | KRA production Basic auth |
| Device serials | KRA sandbox test devices | Live OSCU devices |
| Go-live gate | Internal test plan complete | **KRA integrator certification** |
| Platform status field | `sandbox_testing` | `certified` |

**Production cutover procedure:**

1. Obtain KRA production credentials and certification approval.
2. Update Edge secrets to production URL and credentials.
3. Re-run OSCU initialization for each active vendor device on production.
4. Update `tis_integrator_platform.certification_status` to `certified`.
5. Monitor `tis_submission_log` for 48 hours post-cutover.

---

## 12. Security checklist

| # | Control | Verification |
|---|---------|--------------|
| 1 | KRA credentials in Edge secrets only | Grep repo — no passwords in source |
| 2 | JWT on every proxy call | Unauthenticated requests return 401 |
| 3 | Role-based access | Non-supplier/admin roles blocked |
| 4 | Path allowlist | Arbitrary URLs rejected by proxy |
| 5 | RLS on TIS tables | Non-staff cannot read integrator platform |
| 6 | Communication keys redacted | Audit logs mask `cmcKey` |
| 7 | Optical disk has no `.env` | Run bundle script; manual review before burn |

Run optional security audit:

```bash
npm run security:test
```

---

## 13. Optical disk software bundle

Before submitting the read-only CD/DVD to KRA, generate the software folder:

```powershell
powershell -File scripts/build-tis-optical-disk.ps1
```

**Output:**

```
downloads/TIS-OPTICAL-DISK/
├── README.txt
├── SOFTWARE_MANIFEST.txt
├── 01-SOFTWARE/          ← TIS source files (50+ files)
└── 02-PDF-DOCUMENTS/     ← add exported PDFs manually
```

Review `SOFTWARE_MANIFEST.txt` for completeness. Confirm no secrets before burning.

---

## 14. Document control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-03 | Initial release for KRA optical disk submission |

**Related documents:**

- `TIS_ETIMS_INTEGRATION_ARCHITECTURE.md` — architecture (§14, §21)  
- `USER_OPERATOR_MANUAL.md` — operator procedures  
- `CERTIFICATION_TEST_PLAN.md` — sandbox test cases  
- `OPTICAL_DISK_SUBMISSION_GUIDE.md` — disk assembly instructions  
