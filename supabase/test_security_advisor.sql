-- Test query to verify get_all_security_issues function works
-- Run this in Supabase SQL Editor to see if it returns the 106 warnings

-- Test 1: Check if function exists and can be called
SELECT COUNT(*) as total_issues
FROM get_all_security_issues();

-- Test 2: Get all RLS policy warnings specifically
SELECT 
  issue_type,
  severity,
  category,
  resource_name,
  description
FROM get_all_security_issues()
WHERE issue_type = 'rls_policy_always_true'
ORDER BY resource_name
LIMIT 10;

-- Test 3: Check what pg_policies view returns for a known permissive policy
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check,
  TRIM(BOTH '()' FROM TRIM(COALESCE(qual, ''))) as qual_normalized,
  TRIM(BOTH '()' FROM TRIM(COALESCE(with_check, ''))) as with_check_normalized
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'activity_logs'
  AND policyname = 'activity_logs_insert_policy';

-- Test 4: Direct query to find permissive policies (should match Supabase Security Advisor)
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (
    (qual IS NOT NULL AND TRIM(BOTH '()' FROM TRIM(COALESCE(qual, ''))) = 'true')
    OR (with_check IS NOT NULL AND TRIM(BOTH '()' FROM TRIM(COALESCE(with_check, ''))) = 'true')
  )
ORDER BY tablename, policyname;

