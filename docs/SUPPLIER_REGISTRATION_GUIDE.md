# Supplier registration — template guide

This guide matches the **live** supplier onboarding flow in UjenziXform (`src/pages/SupplierRegistration.tsx`, route **`/supplier-registration`**). Use it for help docs, SOPs, or training suppliers and staff.

---

## Related URLs

| Page | Path | Purpose |
|------|------|---------|
| **Supplier registration (multi-step)** | `/supplier-registration` | Main onboarding: business → location → materials → review & submit |
| **Supplier sign-in** | `/supplier-signin` | Returning suppliers (optional `?redirect=` query) |
| **Supplier auth (tabs)** | `/supplier-auth` | Sign in or sign up; can pre-fill if user already logged in elsewhere |

---

## Before you start (checklist)

- [ ] Stable **business email** (used for login and notifications).
- [ ] **Phone number** buyers or staff can reach.
- [ ] **County**, **town/city**, and a clear **physical address** (yard, shop, or warehouse).
- [ ] **Password** at least **8 characters** (new accounts only).
- [ ] Optional: **company / business registration number** (e.g. BRS-style reference), if you have it.
- [ ] Know which **material categories** you supply (you must pick **at least one** on step 3).

**Already logged in on the site?**  
If the session is not already a **supplier**, the form can **pre-fill email** and skip creating a new password for that step. If the account is already a **builder** (or another conflicting role), registration as supplier is **blocked** and the user is redirected.

---

## Step 1 — Business information

**Screen label:** Business Information  

| Field | Required | Notes |
|--------|----------|--------|
| Business name | Yes | Shown as company identity; also used in profile upsert. |
| Business registration number | No | Optional; stored as `business_registration_number` when provided. |
| Business email | Yes | Disabled if already signed in with that email. |
| Create password | Yes for **new** users | Minimum **8** characters; hidden if already authenticated. |
| Phone number | Yes | Primary contact. |
| Business description | No | Free text; helps buyers understand the business. |

**Validation (step 1):**  
- New user: business name, email, password (≥8), phone.  
- Existing session: business name, phone (email already known).

**Next:** Continue to **Location**.

---

## Step 2 — Business location

**Screen label:** Business Location  

| Field | Required | Notes |
|--------|----------|--------|
| County | Yes | e.g. Nairobi, Kiambu. |
| Town / city | Yes | e.g. Industrial Area, Thika. |
| Physical address | Yes | Building, street, plot, landmarks — helps verification and visits. |

Profile `location` is stored as **`{town}, {county}`** and `physical_address` as entered.

**Next:** Continue to **Materials**.

---

## Step 3 — Materials & pricing

**Screen label:** Materials & Pricing  

| Action | Required | Notes |
|--------|----------|--------|
| Select material categories | Yes — **at least one** | Long list of Kenya construction categories; **Select all / Deselect all** available. |

**In-app note:** Specific SKUs, prices, product photos, and marketing videos are intended to be completed **after registration** in the **supplier dashboard** (the wizard focuses on account + categories).

**Next:** Continue to **Review & submit**.

---

## Step 4 — Review & submit

**Screen label:** Review & Submit  

- Summary cards show business info and selected categories.  
- User must check:  
  - **Terms and conditions** (link: `/terms` in UI)  
  - **Privacy policy** (link: `/privacy-policy` in UI)  

**Submit** runs registration (see “What happens on submit” below).

---

## What happens on submit (technical summary)

1. **Auth**  
   - If no session: `signUp` with email/password and metadata (`user_type` / `role`: supplier).  
   - If session exists: reuse that `user_id`.

2. **Profile**  
   - `profiles` upsert: email, phone, company name, location, description, registration number, physical address, `role` / `user_type`: supplier.

3. **Role**  
   - Ensure `user_roles` has **`supplier`** (RPC `assign_user_role` when available, else direct insert).  
   - Update **auth user metadata** with `role` / `user_type`: supplier.

4. **Application record**  
   - Insert into **`supplier_applications`** when none exists (company, contact, county, address, categories, status `approved` in current code path).

5. **Client session hints**  
   - `localStorage`: `user_role`, `user_role_id`; `sessionStorage` PIN flags for immediate portal use.

6. **After success**  
   - If user already had a session **or** email confirmation is off and a session exists → redirect **`/supplier-dashboard`**.  
   - Else → toast to **confirm email**, then navigate **`/supplier-signin`**.

---

## Supplier sign-in (returning users)

- Path: **`/supplier-signin`**.  
- **Database role is source of truth:** only users with **`user_roles.role = supplier`** complete supplier sign-in; other roles get “wrong portal” messaging and redirect.  
- Password reset and resend verification are available from that flow where implemented.

---

## Quick “copy-paste” template for suppliers (email / PDF)

**Subject:** Register as a supplier on UjenziXform  

1. Open: **[your domain]/supplier-registration**  
2. **Step 1:** Enter business name, email, password (8+ characters), phone, and optional registration number and description.  
3. **Step 2:** Enter county, town, and full physical address.  
4. **Step 3:** Tick every material category you supply (at least one).  
5. **Step 4:** Read the summary, accept terms and privacy, click submit.  
6. **If asked:** Confirm your email, then sign in at **[your domain]/supplier-signin**.  
7. **Next:** Log in to the **supplier dashboard** to add products, prices, and media.

---

## Admin / support notes

- **Admin dashboard** lists “Supplier Registration” as public path **`/supplier-registration`** (navigation reference).  
- A separate file **`SupplierRegistrationEnhanced.tsx`** exists (3-step demo-style UI with product rows); it is **not** the route mounted in `App.tsx` — training should reference **`/supplier-registration`** → `SupplierRegistration.tsx` only unless you wire the enhanced page later.

---

## Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-04-18 | Initial guide from codebase review (`SupplierRegistration.tsx`, `SupplierSignIn.tsx`, `SupplierAuth.tsx`, `App.tsx`). |
