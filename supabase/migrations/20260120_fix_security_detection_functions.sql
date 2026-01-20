-- =====================================================================
-- FIX SECURITY DETECTION FUNCTIONS
-- =====================================================================
-- The security advisor functions need to properly detect:
-- 1. Views with security_invoker=on should NOT be flagged
-- 2. Tables with RLS enabled should NOT be flagged as publicly accessible
-- =====================================================================

-- Drop and recreate get_all_security_issues function
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
    -- Only flag views that DON'T have security_invoker=on
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
        OR NOT (c.reloptions @> ARRAY['security_invoker=on']::text[])
        AND NOT (c.reloptions @> ARRAY['security_invoker=true']::text[])
    )
    -- Exclude system views and known safe views
    AND c.relname NOT IN ('pg_stat_statements', 'pg_stat_activity');

    -- Check for tables without RLS enabled
    RETURN QUERY
    SELECT 
        'no_rls'::TEXT as issue_type,
        'table'::TEXT as resource_type,
        t.tablename::TEXT as resource_name,
        'Row Level Security'::TEXT as category,
        format('The table "%s" can be accessed without authentication. This is a critical security vulnerability.', t.tablename)::TEXT as description,
        'critical'::TEXT as severity,
        format('Enable RLS and create restrictive policies for "%s" table immediately.', t.tablename)::TEXT as recommendation
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename IN ('profiles', 'payments', 'deliveries', 'suppliers', 'delivery_providers')
    AND NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = t.tablename
        AND c.relrowsecurity = true
    );

    -- Check for functions with SECURITY DEFINER and mutable search_path
    RETURN QUERY
    SELECT 
        'function_search_path_mutable'::TEXT as issue_type,
        'function'::TEXT as resource_type,
        p.proname::TEXT as resource_name,
        'Function Security'::TEXT as category,
        format('Function "%s" has a mutable search_path', p.proname)::TEXT as description,
        'high'::TEXT as severity,
        format('Set search_path for function "%s" to prevent search_path injection', p.proname)::TEXT as recommendation
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT (p.proconfig::text[] @> ARRAY['search_path=public']));
    
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_security_issues() TO authenticated;

-- Also fix get_security_definer_views if it exists
DROP FUNCTION IF EXISTS public.get_security_definer_views();

CREATE OR REPLACE FUNCTION public.get_security_definer_views()
RETURNS TABLE (view_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return views that DON'T have security_invoker enabled
    RETURN QUERY
    SELECT c.relname::TEXT
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND (
        c.reloptions IS NULL 
        OR (
            NOT (c.reloptions @> ARRAY['security_invoker=on']::text[])
            AND NOT (c.reloptions @> ARRAY['security_invoker=true']::text[])
        )
    )
    AND c.relname NOT IN ('pg_stat_statements', 'pg_stat_activity');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_definer_views() TO authenticated;

-- Fix get_tables_without_rls if it exists
DROP FUNCTION IF EXISTS public.get_tables_without_rls();

CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE (table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return tables that don't have RLS enabled
    RETURN QUERY
    SELECT t.tablename::TEXT
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = false
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%'
    AND t.tablename IN ('profiles', 'payments', 'deliveries', 'suppliers', 'delivery_providers', 'users', 'auth_users');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO authenticated;

-- Verify the fixes
SELECT 'Security detection functions updated' as status;

