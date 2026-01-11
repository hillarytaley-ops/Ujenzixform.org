-- =============================================
-- Verification Script for RLS Policy Fixes
-- Run this after applying the migration to verify fixes
-- =============================================

-- Count remaining permissive policies
SELECT 
  'Remaining Permissive Policies' as check_type,
  COUNT(*) as count
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (
    p.qual = 'true'
    OR p.with_check = 'true'
  );

-- Show remaining permissive policies by table
SELECT 
  p.tablename,
  p.policyname,
  p.cmd,
  CASE 
    WHEN p.qual = 'true' AND p.with_check = 'true' THEN 'Both USING and WITH CHECK'
    WHEN p.qual = 'true' THEN 'USING clause'
    WHEN p.with_check = 'true' THEN 'WITH CHECK clause'
    ELSE 'Unknown'
  END as permissive_type,
  p.roles
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (
    p.qual = 'true'
    OR p.with_check = 'true'
  )
ORDER BY 
  CASE p.cmd
    WHEN 'DELETE' THEN 1
    WHEN 'UPDATE' THEN 2
    WHEN 'ALL' THEN 3
    WHEN 'INSERT' THEN 4
  END,
  p.tablename,
  p.policyname;

-- Count by severity (UPDATE/DELETE are more critical)
SELECT 
  p.cmd,
  COUNT(*) as count
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (
    p.qual = 'true'
    OR p.with_check = 'true'
  )
GROUP BY p.cmd
ORDER BY 
  CASE p.cmd
    WHEN 'DELETE' THEN 1
    WHEN 'UPDATE' THEN 2
    WHEN 'ALL' THEN 3
    WHEN 'INSERT' THEN 4
  END;

-- Check if critical tables still have permissive policies
SELECT 
  'Critical Tables with Permissive Policies' as check_type,
  p.tablename,
  COUNT(*) as policy_count
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.cmd IN ('UPDATE', 'DELETE', 'ALL')
  AND (
    p.qual = 'true'
    OR p.with_check = 'true'
  )
  AND (
    p.tablename LIKE '%user%'
    OR p.tablename LIKE '%profile%'
    OR p.tablename LIKE '%payment%'
    OR p.tablename LIKE '%security%'
    OR p.tablename LIKE '%admin%'
  )
GROUP BY p.tablename
ORDER BY policy_count DESC;

-- Summary: Expected results after migration
-- - UPDATE/DELETE policies should be 0 or very few (only for logging tables)
-- - INSERT policies may remain for logging/audit tables (intentional)
-- - Total should be significantly reduced from 106

