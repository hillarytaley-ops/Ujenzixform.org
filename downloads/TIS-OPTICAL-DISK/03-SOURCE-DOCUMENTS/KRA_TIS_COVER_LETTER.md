# Cover Letter — Application for KRA eTIMS Sandbox Access

**UjenziXform Solution**  
Barngetuny Plaza Left Wing 3rd Floor Room 10, Ronald Ngala Street, Eldoret  
P. O. Box 4146 - 30100 Eldoret, Kenya  
Trader Invoicing System (TIS) — Third-party eTIMS integrator application  

---

**Date:** 3 June 2026  
**Reference:** UJX-TIS-KRA-ARCH-2026-001  

**To:**  
The Commissioner General  
Kenya Revenue Authority  
Times Tower, Haile Selassie Avenue  
P.O. Box 48240 – 00100, Nairobi, Kenya  

**Attention:** eTIMS Third-Party Integrator / OSCU Certification Unit  

**RE:** Application for KRA eTIMS Sandbox Access and Submission of Technology Architecture  
**Subject:** UjenziXform Trader Invoicing System (TIS) v1.0.0 — OSCU  

---

Dear Sir/Madam,

We write on behalf of **UjenziXform Solution** (platform: **UjenziXform**) to apply for recognition as a **potential third-party eTIMS Trader Invoicing System (TIS) integrator** and to **request access to the KRA eTIMS sandbox** at **https://etims-api-sbx.kra.go.ke**. Enclosed on read-only optical disk are our TIS integration software and certification documents describing how UjenziXform will integrate with KRA eTIMS once sandbox credentials are issued.

### Applicant particulars

| Field | Detail |
|-------|--------|
| Organisation | UjenziXform Solution |
| Platform | UjenziXform |
| TIS product | UjenziXform Trader Invoicing System (TIS) v1.0.0 |
| Solution type | OSCU (Online Sales Control Unit) |
| Applicant KRA PIN | _[Fill in HTML form — see KRA_TIS_COVER_LETTER.html]_ |
| eTIMS portal reference no. | _[Fill in HTML form]_ |
| Contact name | _[Fill in HTML form]_ |
| Contact title | _[Fill in HTML form]_ |
| Contact email | _[Fill in HTML form]_ |
| Contact telephone | +254 715 612073 |
| Registered address | Barngetuny Plaza Left Wing 3rd Floor Room 10, Ronald Ngala Street, Eldoret. P. O. Box 4146 - 30100 Eldoret |
| Website | https://ujenzi-pro.vercel.app/ |

### About UjenziXform

**UjenziXform** is a digital marketplace connecting builders and construction material suppliers across Kenya. Our **Trader Invoicing System (TIS)** will fiscalise supplier sales by transmitting invoice data to KRA eTIMS when a qualifying purchase order is submitted, and by presenting the fiscal receipt and verification QR code to buyers.

### Primary request

We respectfully request that KRA:

1. Accept our application as a potential third-party TIS integrator under the eTIMS framework;
2. Grant UjenziXform sandbox access to **https://etims-api-sbx.kra.go.ke** for OSCU integration testing;
3. Issue sandbox credentials and any required test device or branch data to UjenziXform Solution;
4. Advise on the next steps in integrator registration and certification following sandbox assignment.

We have developed TIS application software in preparation — including a secure API gateway (`etims-proxy`), purchase-order invoice mapping, fiscal receipt display, audit logging, and vendor onboarding — and require KRA-assigned sandbox access to complete OSCU initialization, transaction testing, and certification.

### Declaration of current status

At the date of this letter:

- UjenziXform is an **applicant** for third-party integrator status;
- We **do not yet** hold KRA-assigned eTIMS sandbox credentials;
- We **do not** hold KRA integrator certification;
- TIS is in **development** pending sandbox assignment;
- Production use of **https://etims-api.kra.go.ke** will occur only after formal KRA approval.

### Enclosed on read-only optical disk

1. This cover letter (PDF)  
2. Executive summary  
3. Technology architecture — TIS eTIMS integration (v3.3)  
4. Appendix — sample POST /invoices payload  
5. User / operator manual  
6. Installation and deployment guide  
7. Certification test plan  
8. Optical disk submission instructions  
9. **01-SOFTWARE/** — all TIS integration source files (see SOFTWARE_MANIFEST.txt)  

### Summary of planned integration

UjenziXform will provide TIS software and a secure server-side gateway; **supplier taxpayers** on our marketplace remain fiscal issuers, with each invoice carrying the supplier’s KRA PIN as **traderTin**. All calls to KRA eTIMS will pass through **etims-proxy** with credentials stored as server-side secrets only. We will support OSCU initialization, sales invoices (type S), credit notes (type R), fiscal receipts with QR verification, and multi-vendor onboarding.

We remain available for a demonstration of our TIS application, a technical walkthrough, or any supplementary information KRA requires. Thank you for your consideration.

Yours faithfully,

_______________________________  
**_[Authorised signatory name]_**  
**_[Title — Director / Technical Lead, UjenziXform Solution]_**  

Date: _[Date of signing]_
