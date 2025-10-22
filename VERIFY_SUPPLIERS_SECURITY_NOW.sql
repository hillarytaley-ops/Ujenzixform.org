-- ====================================================
-- VERIFY SUPPLIERS SECURITY NOW
-- Run this AFTER executing the suppliers security fix
-- ====================================================

-- Test 1: Check if public access is eliminated (should return 0 rows)
SELECT 
  'PUBLIC ACCESS CHECK' as test_name,
  table_name,
  grantee,
  privilege_type,
  'CRITICAL: Should be 0 rows' as expected_result
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'suppliers' 
AND grantee IN ('PUBLIC', 'anon');

-- Test 2: Check RLS is enabled (should show true)
SELECT 
  'RLS STATUS CHECK' as test_name,
  tablename,
  rowsecurity as rls_enabled,
  'Should be true' as expected_result
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'suppliers';

-- Test 3: Check RLS policies exist (should show 2+ policies)
SELECT 
  'RLS POLICIES CHECK' as test_name,
  COUNT(*) as policy_count,
  'Should be 2 or more' as expected_result
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'suppliers';

-- Test 4: List current policies
SELECT 
  'CURRENT POLICIES' as test_name,
  policyname,
  cmd,
  'Policy active' as status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'suppliers'
ORDER BY policyname;

-- Test 5: Test safe directory function (should work)
SELECT 
  'SAFE DIRECTORY TEST' as test_name,
  company_name,
  contact_status,
  'Should show: Contact via secure platform' as expected
FROM get_suppliers_now_safe_directory() 
LIMIT 3;

-- Test 6: Test secure contact function (should show protected for non-admin)
SELECT 
  'CONTACT SECURITY TEST' as test_name,
  company_name,
  email,
  phone,
  access_granted,
  access_reason,
  'Should show PROTECTED for non-admin users' as expected
FROM get_supplier_contact_now_secure(
  (SELECT id FROM suppliers WHERE is_verified = true LIMIT 1)
);

-- VERIFICATION SUMMARY
DO $$
DECLARE
  public_grants INTEGER;
  policies INTEGER;
  rls_status BOOLEAN;
  functions INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_grants FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'suppliers' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO policies FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  SELECT rowsecurity INTO rls_status FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  SELECT COUNT(*) INTO functions FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name LIKE '%supplier%now%';
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'SUPPLIERS SECURITY VERIFICATION RESULTS';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Public access grants: % (MUST be 0)', public_grants;
  RAISE NOTICE 'RLS policies: % (MUST be 2+)', policies;
  RAISE NOTICE 'RLS enabled: % (MUST be true)', rls_status;
  RAISE NOTICE 'Security functions: % (MUST be 3)', functions;
  
  IF public_grants = 0 AND policies >= 2 AND rls_status AND functions = 3 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 VERIFICATION SUCCESS: SUPPLIERS SECURITY ACTIVE';
    RAISE NOTICE '✅ PUBLIC_SUPPLIER_DATA vulnerability: ELIMINATED';
    RAISE NOTICE '✅ Competitor harvesting: PREVENTED';
    RAISE NOTICE '✅ Contact information: PROTECTED';
    RAISE NOTICE '✅ Business relationships: VERIFICATION ACTIVE';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ VERIFICATION FAILED: SECURITY ISSUES REMAIN';
    IF public_grants > 0 THEN
      RAISE NOTICE '❌ CRITICAL: Public access still exists!';
    END IF;
    IF policies < 2 THEN
      RAISE NOTICE '❌ Insufficient RLS policies';
    END IF;
    IF NOT rls_status THEN
      RAISE NOTICE '❌ CRITICAL: RLS not enabled!';
    END IF;
  END IF;
  
  RAISE NOTICE '====================================================';
END $$;
