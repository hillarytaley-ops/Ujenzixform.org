-- =====================================================================
-- VERIFY AND FIX RLS ON REMAINING TABLES
-- =====================================================================

-- First, let's check current RLS status
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname IN ('deliveries', 'suppliers', 'delivery_providers', 'profiles', 'payments')
    LOOP
        RAISE NOTICE 'Table: %, RLS: %, Force RLS: %', tbl.relname, tbl.relrowsecurity, tbl.relforcerowsecurity;
    END LOOP;
END $$;

-- Force enable RLS on all tables (in case it wasn't properly enabled)
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_providers FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments FORCE ROW LEVEL SECURITY;

-- Now update the security detection function to check relrowsecurity correctly
DROP FUNCTION IF EXISTS public.get_all_security_issues();

CREATE OR REPLACE FUNCTION public.get_all_security_issues()
RETURNS TABLE (
    issue_type TEXT,
    resource_type TEXT,
    resource_name TEXT,
    category TEXT,
    description TEXT,
    severity TEXT,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check for views WITHOUT security_invoker (SECURITY DEFINER views)
    RETURN QUERY
    SELECT 
        'security_definer_view'::TEXT as issue_type,
        'view'::TEXT as resource_type,
        c.relname::TEXT as resource_name,
        'View Security'::TEXT as category,
        format('View "%s" may have security issues', c.relname)::TEXT as description,
        'critical'::TEXT as severity,
        format('Review view "%s" for SECURITY DEFINER usage', c.relname)::TEXT as recommendation
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND (
        c.reloptions IS NULL 
        OR (
            NOT (c.reloptions @> ARRAY['security_invoker=on']::text[])
            AND NOT (c.reloptions @> ARRAY['security_invoker=true']::text[])
            AND NOT (c.reloptions @> ARRAY['security_invoker=1']::text[])
        )
    )
    AND c.relname NOT LIKE 'pg_%';

    -- Check for critical tables without RLS enabled
    -- Using direct check on pg_class.relrowsecurity
    RETURN QUERY
    SELECT 
        'no_rls'::TEXT as issue_type,
        'table'::TEXT as resource_type,
        c.relname::TEXT as resource_name,
        'Row Level Security'::TEXT as category,
        format('The table "%s" can be accessed without authentication. This is a critical security vulnerability.', c.relname)::TEXT as description,
        'critical'::TEXT as severity,
        format('Enable RLS and create restrictive policies for "%s" table immediately.', c.relname)::TEXT as recommendation
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- regular table
    AND c.relname IN ('profiles', 'payments', 'deliveries', 'suppliers', 'delivery_providers')
    AND c.relrowsecurity = false;  -- Only tables where RLS is NOT enabled
    
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_security_issues() TO authenticated;

-- Verify RLS is now enabled
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN ('deliveries', 'suppliers', 'delivery_providers', 'profiles', 'payments')
ORDER BY c.relname;

