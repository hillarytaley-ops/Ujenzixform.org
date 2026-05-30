# UjenziXform Security Runbook

Last updated: May 2026  
Target posture: **9.5/10** (code + ops evidence)

---

## 1. Security controls summary

| Control | Implementation | Verification |
|---------|----------------|--------------|
| Authentication | Supabase Auth JWT | Sign-in required for protected routes |
| Authorization | `user_roles` + RLS | Role from DB only (`useAuth().userRole`) |
| Admin dashboard | Supabase JWT required in production | `VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN=true` |
| Payments | Paystack server-side amount + webhook HMAC | `paystack-initialize`, `paystack-webhook` |
| Invoice paid state | Paystack verify only | `process-payment` Edge Function |
| Email | Admin or self-only | `send-email` Edge Function |
| eTIMS | JWT + path allowlist | `etims-proxy` |
| Staff login | Rate-limited RPC + Edge verify | `verify-admin-staff-login` |
| CSP | Vercel headers | No wildcard `https:` img/connect |

---

## 2. Production deployment checklist

### 2.1 Apply database migrations

```bash
supabase db push
# Or run in Supabase SQL Editor:
# - 20260528120000_critical_rls_orphan_policy_cleanup.sql
# - 20260528120100_link_admin_staff_auth_users.sql
```

### 2.2 Deploy Edge Functions

```bash
npm run deploy:security-functions
# or manually:
supabase functions deploy process-payment paystack-initialize send-email staff-auth-bootstrap provision-staff-auth verify-admin-staff-login
```

### 2.3 Link staff to auth.users

After migrations, as super admin in SQL Editor:

```sql
SELECT public.link_all_admin_staff_auth_users();
```

Or per staff email:

```sql
SELECT public.link_admin_staff_auth_user('staff@ujenzixform.org');
```

Staff can also self-provision on login: `AdminAuth` calls `staff-auth-bootstrap` when credentials are valid but no auth user exists.

### 2.4 Vercel environment

Ensure production has:

- `VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN=true` (set in `vercel.json`)
- `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY` on Supabase Edge secrets
- `SUPABASE_SERVICE_ROLE_KEY` on Edge Functions only (never in frontend)

---

## 3. Pen-test / evidence matrix

Use this table for KRA disk or internal audit. Capture screenshots after each test.

| # | Test | Steps | Expected | Evidence file |
|---|------|-------|----------|---------------|
| T1 | Anonymous invoice pay | POST `/functions/v1/process-payment` without JWT | 401 Unauthorized | `evidence/t1-process-payment-anon.png` |
| T2 | User A pays User B invoice | Initialize Paystack with wrong `orderId` | 403/404 from server | `evidence/t2-paystack-order-ownership.png` |
| T3 | Amount tampering | `paystack-initialize` with wrong `amount` | 400 amount mismatch | `evidence/t3-paystack-amount.png` |
| T4 | Email abuse | Authenticated non-admin sends to arbitrary `to` | 403 | `evidence/t4-send-email.png` |
| T5 | Admin localStorage bypass | Set `admin_authenticated=true` in DevTools, no JWT | Redirect / deny admin dashboard | `evidence/t5-admin-bypass.png` |
| T6 | test_role URL | Production `?test_role=super_admin` | No role simulation | `evidence/t6-test-role.png` |
| T7 | Supplier competitor prices | Supplier JWT SELECT all `supplier_product_prices` | Only own rows | `evidence/t7-supplier-prices-rls.png` |
| T8 | Profiles anon read | Anon SELECT `profiles` | Denied / own policies only | `evidence/t8-profiles-rls.png` |
| T9 | user_roles self-admin | INSERT own row with role=admin | RLS deny | `evidence/t9-user-roles-insert.png` |
| T10 | Staff bootstrap | Valid staff code, no auth user | User created + JWT session | `evidence/t10-staff-bootstrap.png` |

Store screenshots under `docs/security/evidence/` (gitignored if sensitive) or attach to submission folder.

---

## 4. RLS policy verification query

Run monthly on production:

```sql
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;
```

Any `true` qual on sensitive tables should be documented or removed.

---

## 5. Incident response

1. Rotate `PAYSTACK_SECRET_KEY` / `RESEND_API_KEY` if leaked  
2. Revoke compromised JWT via Supabase Auth dashboard  
3. Review `admin_security_logs` and `security_events`  
4. Re-run `link_all_admin_staff_auth_users()` after auth recovery  

---

## 6. Remaining hardening (optional → 10/10)

- CSP: remove `'unsafe-inline'` styles (nonce/hash refactor)  
- WAF / rate limits at CDN edge  
- External penetration test report  
- SOC2 / ISO mapping if required by enterprise customers  
