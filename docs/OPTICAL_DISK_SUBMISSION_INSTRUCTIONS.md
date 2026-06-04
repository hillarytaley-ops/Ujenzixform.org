# UjenziXform TIS — Optical Disk Submission Instructions

**Document type:** Step-by-step guide (KRA certification submission)  
**Applicant:** UjenziXform Solution  
**Product:** UjenziXform Trader Invoicing System (TIS) v1.0.0  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Document version:** 1.0  
**Date:** 3 June 2026  

---

## Table of contents

1. [What KRA requires](#1-what-kra-requires)
2. [When to submit the disc](#2-when-to-submit-the-disc)
3. [What must be on the disc](#3-what-must-be-on-the-disc)
4. [Folder structure on the disc](#4-folder-structure-on-the-disc)
5. [Step 1 — Prepare content on your computer](#5-step-1--prepare-content-on-your-computer)
6. [Step 2 — Pre-burn verification checklist](#6-step-2--pre-burn-verification-checklist)
7. [Step 3 — Burn a read-only CD or DVD](#7-step-3--burn-a-read-only-cd-or-dvd)
8. [Step 4 — Label the disc](#8-step-4--label-the-disc)
9. [Step 5 — Submit to KRA](#9-step-5--submit-to-kra)
10. [Certification timeline](#10-certification-timeline)
11. [Troubleshooting](#11-troubleshooting)
12. [Document control](#12-document-control)

---

## 1. What KRA requires

Kenya Revenue Authority (KRA) requires integrator applicants to submit a **read-only optical disk (CD or DVD)** **prior to certification** of the Trader Invoicing System (TIS) integration.

The disc must contain:

| # | Content |
|---|---------|
| 1 | **All files that make up the TIS integration software** |
| 2 | **All PDF documents needed during the certification process** |

This is a **physical media** requirement. A GitHub link, email attachment, or cloud folder is **not** a substitute unless KRA explicitly accepts an alternative (always confirm with the eTIMS certification unit).

---

## 2. When to submit the disc

Submit the optical disk **before** KRA runs your formal TIS certification or sandbox test cycle.

| Phase | Action |
|-------|--------|
| **Now (application stage)** | Prepare disc content, burn read-only CD/DVD |
| **With your application** | Deliver disc + cover letter to KRA |
| **After KRA accepts application** | Receive sandbox credentials |
| **Sandbox testing** | Execute certification test plan (separate document) |
| **Certification decision** | Production cutover only after KRA approval |

**Rule of thumb:** If KRA has not yet certified your TIS integration, and you are applying as a third-party integrator, the optical disk should be submitted **with or immediately after** your sandbox access application — **not after** certification is complete.

---

## 3. What must be on the disc

### 3.1 TIS integration software (`01-SOFTWARE/`)

All source files that implement UjenziXform’s KRA eTIMS integration, including:

| Component | Description |
|-----------|-------------|
| `src/lib/etims/` | Core TIS library (PO mapping, OSCU init, audit) |
| `src/components/admin/tis-integrator/` | Admin TIS Integrator Hub |
| `src/components/etims/` | Fiscal receipt and QR UI |
| `src/components/admin/Etims*.tsx` | Admin test and PO submit panels |
| `src/components/supplier/SupplierEtimsSettingsPanel.tsx` | Supplier KRA settings |
| `supabase/functions/etims-proxy/` | Secure KRA API gateway |
| `supabase/functions/_shared/etimsPathAllowlist.ts` | REST path allowlist |
| `supabase/migrations/*etims*` / `*tis*` | Database schema for TIS |

A machine-readable list of every file is in **`SOFTWARE_MANIFEST.txt`** at the disc root.

### 3.2 Certification PDFs (`02-PDF-DOCUMENTS/`)

| File | Purpose |
|------|---------|
| `01_KRA_TIS_COVER_LETTER.pdf` | Sandbox access request |
| `02_EXECUTIVE_SUMMARY.pdf` | One-page overview |
| `03_TIS_ETIMS_INTEGRATION_ARCHITECTURE.pdf` | Full integration architecture |
| `04_APPENDIX_SAMPLE_SALESREQ.pdf` | Sample POST /invoices payload |
| `05_USER_OPERATOR_MANUAL.pdf` | Operator procedures |
| `06_INSTALLATION_DEPLOYMENT_GUIDE.pdf` | Deployment and configuration |
| `07_CERTIFICATION_TEST_PLAN.pdf` | Sandbox test cases |
| `08_OPTICAL_DISK_SUBMISSION_INSTRUCTIONS.pdf` | This guide |

### 3.3 Optional (`03-SOURCE-DOCUMENTS/`)

Markdown and HTML originals from the architecture pack may be included for KRA reviewer reference. PDFs in `02-PDF-DOCUMENTS/` remain the primary certification documents.

### 3.4 What must NOT be on the disc

| Exclude | Reason |
|---------|--------|
| `.env` / `.env.local` | May contain secrets |
| Live KRA or Supabase passwords | Security |
| Full platform codebase unrelated to TIS | Out of scope |
| Paystack, M-Pesa, or other non-eTIMS secrets | Not part of TIS submission |

---

## 4. Folder structure on the disc

When the disc is inserted, the **root** should show:

```
README.txt
SOFTWARE_MANIFEST.txt
01-SOFTWARE/
02-PDF-DOCUMENTS/
03-SOURCE-DOCUMENTS/     (optional)
```

**Important:** Burn the **contents** of the prepared folder — not the parent directory name alone.

**Prepared folder on your computer (before burn):**

```
D:\UjenziXform\downloads\TIS-OPTICAL-DISK\
```

---

## 5. Step 1 — Prepare content on your computer

Open **PowerShell** at the UjenziXform repository root (`D:\UjenziXform`).

### 5.1 One-command prepare (recommended)

```powershell
powershell -File scripts/prepare-tis-optical-disk.ps1
```

This script:

1. Builds `01-SOFTWARE/` and `SOFTWARE_MANIFEST.txt`
2. Generates all PDFs in `02-PDF-DOCUMENTS/`
3. Copies optional source documents to `03-SOURCE-DOCUMENTS/`
4. Prints a pre-burn checklist

### 5.2 Manual prepare (alternative)

Run each step separately:

```powershell
# Software bundle
powershell -File scripts/build-tis-optical-disk.ps1

# All certification PDFs
powershell -File scripts/generate-tis-cert-pdfs.ps1

# Optional: source Markdown pack
Copy-Item "downloads\TIS-ETIMS-Architecture" `
  "downloads\TIS-OPTICAL-DISK\03-SOURCE-DOCUMENTS" -Recurse -Force
```

### 5.3 Complete cover letter before final PDF

Edit bracketed fields in:

- `downloads/TIS-ETIMS-Architecture/KRA_TIS_COVER_LETTER.md` (or `.html`)

| Field | Example |
|-------|---------|
| Applicant KRA PIN | Your registered PIN |
| eTIMS portal reference no. | From etims.kra.go.ke application |
| Primary contact person | Name and title |
| Contact email / telephone | Support contact |
| Physical / registered address | Company address |
| Authorised signatory | Name, title, date |

Then regenerate PDFs:

```powershell
powershell -File scripts/generate-tis-cert-pdfs.ps1
```

---

## 6. Step 2 — Pre-burn verification checklist

Complete every item before burning:

| # | Check | Pass? |
|---|-------|-------|
| 1 | `01-SOFTWARE/` exists and contains `src/lib/etims/` and `supabase/functions/etims-proxy/` | ☐ |
| 2 | `SOFTWARE_MANIFEST.txt` lists all files (50+ TIS files) | ☐ |
| 3 | All **8 PDFs** present in `02-PDF-DOCUMENTS/` | ☐ |
| 4 | Cover letter PDF has **no bracketed placeholders** | ☐ |
| 5 | No `.env` files anywhere on the disc folder | ☐ |
| 6 | No API keys or passwords in any file (spot-check manifest) | ☐ |
| 7 | `README.txt` at disc root describes contents | ☐ |
| 8 | Duplicate backup copy of folder saved elsewhere | ☐ |

**Quick file count:**

```powershell
(Get-ChildItem "downloads\TIS-OPTICAL-DISK\02-PDF-DOCUMENTS\*.pdf").Count
# Expected: 8
```

---

## 7. Step 3 — Burn a read-only CD or DVD

### 7.1 Media choice

| Media | Recommendation |
|-------|----------------|
| **CD-R** | Sufficient (~2 MB software + ~2 MB PDFs) |
| **DVD-R** | Also fine; use if that is what you have |
| **CD-RW / DVD-RW** | Avoid if possible — finalize as read-only is harder |
| **USB stick** | Only if KRA explicitly accepts it |

### 7.2 Option A — Windows File Explorer (simplest)

1. Insert blank **CD-R** or **DVD-R**.
2. Open `D:\UjenziXform\downloads\TIS-OPTICAL-DISK\`.
3. Select **all items** inside (not the parent folder):
   - `README.txt`
   - `SOFTWARE_MANIFEST.txt`
   - `01-SOFTWARE`
   - `02-PDF-DOCUMENTS`
   - `03-SOURCE-DOCUMENTS` (if present)
4. Right-click → **Send to** → your **DVD RW Drive (D:)** or similar.
5. Choose **With a CD/DVD player** (mastered) if Windows asks — this finalizes as read-only.
6. Click **Burn to disc** and wait for completion.
7. **Eject and re-insert** the disc.
8. Confirm you can **read** files but **cannot delete or modify** anything on the disc.

### 7.3 Option B — ISO then burn (ImgBurn / CDBurnerXP)

1. Create an ISO image from the `TIS-OPTICAL-DISK` folder contents.
2. Burn with **Finalize disc** / **Disc at once** enabled.
3. Verify read-only after burn.

### 7.4 Option C — IT shop / duplication service

Provide the service with:

- Folder: `D:\UjenziXform\downloads\TIS-OPTICAL-DISK\`
- Instruction: **Data disc, finalized read-only, no multi-session**
- Request **two copies** (one for KRA, one for your records)

### 7.5 After burn — verify on a second PC if possible

Open the disc on another computer and confirm:

- All folders open correctly
- PDFs open in a PDF reader
- Software files are readable text/source (not corrupted)

---

## 8. Step 4 — Label the disc

Apply a handwritten or printed label on the disc surface or case:

```
UjenziXform Trader Invoicing System (TIS) v1.0.0
UjenziXform Solution
Barngetuny Plaza, Ronald Ngala St, Eldoret
P. O. Box 4146 - 30100 Eldoret
Reference: UJX-TIS-KRA-ARCH-2026-001
Submission date: [DD Month YYYY]
KRA eTIMS TIS Certification — Read Only
```

Include the same reference on any **disc sleeve** or **courier envelope**.

---

## 9. Step 5 — Submit to KRA

### 9.1 What to send together

| Item | Format |
|------|--------|
| Read-only optical disc | CD or DVD (this guide) |
| Cover letter | Printed copy matching `01_KRA_TIS_COVER_LETTER.pdf` |
| Company registration docs | As KRA requests (often separate from disc) |

### 9.2 Where and how to deliver

Confirm the current delivery method with KRA:

| Channel | Notes |
|---------|-------|
| **eTIMS portal** (etims.kra.go.ke) | Upload if integrator application allows attachments |
| **Physical delivery** | Times Tower, Haile Selassie Avenue, Nairobi (as per cover letter) |
| **Courier** | If KRA certification unit provides a mailing address |

**Ask KRA explicitly:** *“Where should we deliver the read-only optical disk for third-party TIS integrator certification?”*

### 9.3 What to record for your files

| Record | Why |
|--------|-----|
| Date of submission | Audit trail |
| KRA receipt / reference number | Proof of delivery |
| Name of KRA officer (if in person) | Follow-up contact |
| Copy of disc burned | Backup if disc is damaged in transit |

---

## 10. Certification timeline

```
Prepare disc content
       ↓
Burn read-only CD/DVD
       ↓
Submit disc + cover letter to KRA   ← optical disk requirement fulfilled here
       ↓
KRA reviews application
       ↓
Sandbox credentials assigned
       ↓
Execute certification test plan (doc 07)
       ↓
Submit test results to KRA
       ↓
KRA certification decision
       ↓
Production eTIMS cutover (after approval only)
```

The optical disk satisfies KRA’s **pre-certification software and documentation** requirement at the **Submit disc + cover letter** stage.

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| PDF script fails | Ensure Microsoft Edge is installed; run from repo root |
| Software script fails | Run PowerShell as normal user; check `scripts/build-tis-optical-disk.ps1` path |
| Disc is rewritable after burn | Use CD-R/DVD-R; choose “finalize” / mastered mode; reburn |
| Files missing on burnt disc | Burn **contents** of `TIS-OPTICAL-DISK\`, not an empty parent folder |
| KRA rejects USB instead of CD | Obtain blank CD-R; confirm media type with KRA before resubmitting |
| Cover letter still has `[brackets]` | Edit source MD/HTML; regenerate PDFs; re-burn disc |
| Manifest count wrong | Re-run `build-tis-optical-disk.ps1` after code changes |

---

## 12. Document control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-03 | Initial optical disk submission instructions |

**Related documents:**

| Document | Location |
|----------|----------|
| Gap checklist | `OPTICAL_DISK_SUBMISSION_GUIDE.md` |
| Cover letter | `KRA_TIS_COVER_LETTER.pdf` |
| Architecture | `TIS_ETIMS_INTEGRATION_ARCHITECTURE.pdf` |
| Test plan | `CERTIFICATION_TEST_PLAN.pdf` |

**Repository scripts:**

| Script | Purpose |
|--------|---------|
| `scripts/prepare-tis-optical-disk.ps1` | Full prepare (software + PDFs + optional sources) |
| `scripts/build-tis-optical-disk.ps1` | Software bundle only |
| `scripts/generate-tis-cert-pdfs.ps1` | PDF generation only |

**Prepared folder (before burn):** `D:\UjenziXform\downloads\TIS-OPTICAL-DISK\`
