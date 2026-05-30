# Apply security migrations on production Supabase (SQL Editor or CLI)

Run in order:

1. `supabase/migrations/20260528120000_critical_rls_orphan_policy_cleanup.sql`
2. `supabase/migrations/20260528120100_link_admin_staff_auth_users.sql`

Then verify:

```sql
SELECT public.link_all_admin_staff_auth_users();
```

Deploy Edge Functions (requires Supabase CLI + login):

```bash
npm run deploy:security-functions
```

Or deploy individually from the Supabase Dashboard → Edge Functions.
