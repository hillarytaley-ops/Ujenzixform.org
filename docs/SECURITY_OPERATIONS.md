# Security operations checklist

## After any public build that might have used `VITE_SUPABASE_SERVICE_ROLE_KEY`

1. In **Supabase Dashboard → Project Settings → API**, **rotate the `service_role` key** (generate new secret, update Edge Functions / server env only — never `VITE_*`).
2. Review **Database → Logs** and **Auth** logs for unusual activity around the exposure window.
3. Confirm the current app revision **does not** reference service role in the client (search the built `assets/*.js` on a preview deploy if unsure).

## Confirm analytics RLS migration is live

Run in the **SQL Editor** (adjust if your policy names differ):

```sql
-- Expect a row for authenticated insert with user_id check
SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'analytics_events';

-- Should show false for anon insert
SELECT has_table_privilege('anon', 'public.analytics_events', 'INSERT');
```

After `20260328120000_analytics_events_tighten_insert_rls.sql`, **`anon` must not have `INSERT`** on `analytics_events`.

After `20260328140000_analytics_admin_select_and_is_admin_grant.sql`, admins (`public.is_admin()`) can **`SELECT`** all analytics rows for reporting.

## Optional: stricter auth token storage (XSS tradeoff)

Set in `.env` / Vercel:

```bash
VITE_SUPABASE_AUTH_STORAGE=session
```

This uses **`sessionStorage`** for the Supabase auth session (tab-scoped). It does **not** remove XSS risk; it shortens how long a stolen tab session lasts. Default remains **`localStorage`** for persistence across tabs.

## Reporting

If you add a CSP **report-uri** / **report-to** endpoint later, point it at your observability stack and monitor violations before enforcing stricter `Content-Security-Policy` in `report-only` mode.
