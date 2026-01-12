# Troubleshooting Migration Errors

## Error: "Failed to fetch (api.supabase.com)"

This error typically means:
1. **Network timeout** - The migration is taking too long
2. **Migration too large** - Too many operations in one transaction
3. **Network connectivity issue** - Temporary Supabase API issue

---

## Solutions

### Solution 1: Use Simplified Migration (Recommended)

I've created a **simplified version** that processes fewer tables at once:
- `20260110_fix_critical_security_errors_simplified.sql`

**How to use:**
1. Run the simplified migration first
2. If it succeeds, check how many errors remain
3. Run it again if needed (it's idempotent)

### Solution 2: Run in Smaller Chunks

Instead of running the full migration, you can:

1. **First, identify which tables need RLS:**
```sql
-- Run this query to see which tables don't have RLS
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = t.tablename AND n.nspname = t.schemaname AND c.relrowsecurity = true
  )
ORDER BY t.tablename;
```

2. **Then enable RLS on specific tables one by one:**
```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
```

3. **Create policies for specific tables:**
```sql
CREATE POLICY "admin_only_select_table_name" ON public.table_name FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "admin_only_insert_table_name" ON public.table_name FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_only_update_table_name" ON public.table_name FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_only_delete_table_name" ON public.table_name FOR DELETE TO authenticated USING (is_admin());
```

### Solution 3: Check Network Connection

1. **Refresh the Supabase dashboard**
2. **Try again in a few minutes** (might be temporary API issue)
3. **Check Supabase status page** for outages

### Solution 4: Use Supabase CLI (Alternative)

If the web SQL editor keeps timing out:

1. **Install Supabase CLI:**
```bash
npm install -g supabase
```

2. **Link your project:**
```bash
supabase link --project-ref your-project-ref
```

3. **Run migration:**
```bash
supabase db push
```

---

## Quick Fix: Run Only Critical Parts

If you just want to fix the 8 errors quickly, run this minimal version:

```sql
-- Ensure is_admin() exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$$;

-- Enable RLS on a few critical tables (add more as needed)
ALTER TABLE IF EXISTS public.emergency_lockdown_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Create basic policies (repeat for each table)
CREATE POLICY IF NOT EXISTS "admin_only_select_emergency_lockdown_log" 
  ON public.emergency_lockdown_log FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY IF NOT EXISTS "admin_only_insert_emergency_lockdown_log" 
  ON public.emergency_lockdown_log FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY IF NOT EXISTS "admin_only_update_emergency_lockdown_log" 
  ON public.emergency_lockdown_log FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY IF NOT EXISTS "admin_only_delete_emergency_lockdown_log" 
  ON public.emergency_lockdown_log FOR DELETE TO authenticated USING (is_admin());
```

---

## Next Steps

1. **Try the simplified migration first**
2. **Check how many errors remain** after running it
3. **Run it multiple times** if needed (it's safe to run multiple times)
4. **If still timing out**, use the "Quick Fix" approach above

Let me know which approach works for you!

