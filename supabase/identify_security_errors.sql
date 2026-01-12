-- =============================================
-- Query to Identify Security Errors
-- Run this in Supabase SQL Editor to see the 20 errors
-- =============================================

-- 1. Get all security issues (including errors)
SELECT 
  issue_type,
  severity,
  category,
  resource_name,
  resource_type,
  description,
  recommendation
FROM get_all_security_issues()
WHERE severity IN ('critical', 'high')
  OR issue_type IN ('rls_disabled', 'no_policies')
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    ELSE 3
  END,
  resource_name;

-- 2. Get tables without RLS enabled
SELECT 
  'rls_disabled' as issue_type,
  'critical' as severity,
  t.tablename as resource_name,
  'Table "' || t.tablename || '" does not have Row Level Security enabled' as description
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

-- 3. Get tables with RLS but no policies
SELECT 
  'no_policies' as issue_type,
  'high' as severity,
  t.tablename as resource_name,
  'Table "' || t.tablename || '" has RLS enabled but no policies defined' as description
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
  )
ORDER BY t.tablename;

-- 4. Count errors by type
SELECT 
  issue_type,
  COUNT(*) as count
FROM get_all_security_issues()
WHERE severity IN ('critical', 'high')
  OR issue_type IN ('rls_disabled', 'no_policies')
GROUP BY issue_type
ORDER BY count DESC;

