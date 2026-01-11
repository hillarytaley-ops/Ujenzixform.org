-- =====================================================================
-- SECURITY ADVISOR FUNCTIONS
-- Created: December 25, 2025
-- 
-- These functions query database metadata to find security issues
-- that Supabase Security Advisor would report
-- =====================================================================

-- Function to get all tables without RLS enabled
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE (
  table_name TEXT,
  schema_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT as table_name,
    t.schemaname::TEXT as schema_name
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
    )
  ORDER BY t.tablename;
END;
$$;

-- Function to get all functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_security_definer_functions()
RETURNS TABLE (
  function_name TEXT,
  schema_name TEXT,
  function_oid OID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT as function_name,
    n.nspname::TEXT as schema_name,
    p.oid as function_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER
    AND p.proname NOT LIKE 'pg_%'  -- Exclude PostgreSQL system functions
  ORDER BY p.proname;
END;
$$;

-- Function to get all views with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_security_definer_views()
RETURNS TABLE (
  view_name TEXT,
  schema_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.viewname::TEXT as view_name,
    v.schemaname::TEXT as schema_name
  FROM pg_views v
  WHERE v.schemaname = 'public'
    AND EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = v.viewname
        AND n.nspname = v.schemaname
        AND c.relkind = 'v'
    )
  ORDER BY v.viewname;
END;
$$;

-- Function to get tables with RLS enabled but no policies
CREATE OR REPLACE FUNCTION public.get_tables_without_policies()
RETURNS TABLE (
  table_name TEXT,
  schema_name TEXT,
  rls_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT as table_name,
    t.schemaname::TEXT as schema_name,
    c.relrowsecurity as rls_enabled
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true  -- RLS is enabled
    AND NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    )
  ORDER BY t.tablename;
END;
$$;

-- Function to get all security issues (comprehensive check)
CREATE OR REPLACE FUNCTION public.get_all_security_issues()
RETURNS TABLE (
  issue_type TEXT,
  severity TEXT,
  category TEXT,
  resource_name TEXT,
  resource_type TEXT,
  description TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  issue_count INTEGER := 0;
BEGIN
  -- Tables without RLS
  RETURN QUERY
  SELECT 
    'rls_disabled'::TEXT as issue_type,
    CASE 
      WHEN t.tablename LIKE '%user%' OR t.tablename LIKE '%profile%' OR t.tablename LIKE '%payment%' 
      THEN 'critical'::TEXT
      ELSE 'high'::TEXT
    END as severity,
    'Row Level Security'::TEXT as category,
    t.tablename::TEXT as resource_name,
    'table'::TEXT as resource_type,
    ('Table "' || t.tablename || '" does not have Row Level Security enabled')::TEXT as description,
    ('ALTER TABLE ' || t.tablename || ' ENABLE ROW LEVEL SECURITY;')::TEXT as recommendation
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
    );

  -- Functions with SECURITY DEFINER
  RETURN QUERY
  SELECT 
    'security_definer_function'::TEXT as issue_type,
    'medium'::TEXT as severity,
    'Function Security'::TEXT as category,
    p.proname::TEXT as resource_name,
    'function'::TEXT as resource_type,
    ('Function "' || p.proname || '" uses SECURITY DEFINER')::TEXT as description,
    ('Review function "' || p.proname || '" and consider using SECURITY INVOKER if possible')::TEXT as recommendation
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proname NOT LIKE 'pg_%';

  -- Views with SECURITY DEFINER (if any)
  RETURN QUERY
  SELECT 
    'security_definer_view'::TEXT as issue_type,
    'critical'::TEXT as severity,
    'View Security'::TEXT as category,
    v.viewname::TEXT as resource_name,
    'view'::TEXT as resource_type,
    ('View "' || v.viewname || '" may have security issues')::TEXT as description,
    ('Review view "' || v.viewname || '" for SECURITY DEFINER usage')::TEXT as recommendation
  FROM pg_views v
  WHERE v.schemaname = 'public';

  -- Tables with RLS but no policies
  RETURN QUERY
  SELECT 
    'no_policies'::TEXT as issue_type,
    'high'::TEXT as severity,
    'RLS Policies'::TEXT as category,
    t.tablename::TEXT as resource_name,
    'table'::TEXT as resource_type,
    ('Table "' || t.tablename || '" has RLS enabled but no policies defined')::TEXT as description,
    ('Create appropriate RLS policies for "' || t.tablename || '" table')::TEXT as recommendation
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_definer_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_definer_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_without_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_security_issues() TO authenticated;

