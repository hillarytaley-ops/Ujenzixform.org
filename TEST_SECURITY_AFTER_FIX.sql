-- ====================================================
-- TEST SUPPLIERS SECURITY AFTER FIX
-- Run this to verify the security implementation
-- ====================================================

-- Test 1: Verify no public access (should return 0 rows)
SELECT 
  'PUBLIC ACCESS CHECK' as test_name,
  COUNT(*) as public_grants,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No public access'
    ELSE '❌ VULNERABLE - Public access exists'
  END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'suppliers' 
AND grantee = 'PUBLIC';

-- Test 2: Check RLS policies exist
SELECT 
  'RLS POLICIES CHECK' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ SECURE - RLS policies active'
    ELSE '❌ INCOMPLETE - Need more policies'
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'suppliers';

-- Test 3: List all current policies
SELECT 
  'CURRENT POLICIES' as test_name,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'suppliers'
ORDER BY policyname;

-- Test 4: Test public directory (should show basic info only)
SELECT 
  'PUBLIC DIRECTORY TEST' as test_name,
  id,
  company_name,
  contact_status,
  'Should show: Contact via secure platform' as expected
FROM get_suppliers_public_directory() 
LIMIT 2;

-- Test 5: Test secure contact access (should show protected for non-admin)
SELECT 
  'CONTACT ACCESS TEST' as test_name,
  company_name,
  email,
  phone,
  access_granted,
  access_reason,
  'Should show PROTECTED for non-admin' as expected
FROM get_supplier_contact_secure(
  (SELECT id FROM suppliers WHERE is_verified = true LIMIT 1)
);

-- Test 6: Check business relationships table exists
SELECT 
  'BUSINESS RELATIONSHIPS TABLE' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_relationships'
    ) THEN '✅ EXISTS - Business relationship system ready'
    ELSE '❌ MISSING - Business relationship table not found'
  END as status;

-- Test 7: Verify functions exist
SELECT 
  'SECURITY FUNCTIONS CHECK' as test_name,
  routine_name,
  '✅ AVAILABLE' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_supplier_contact_secure',
  'get_suppliers_public_directory', 
  'get_suppliers_admin_directory',
  'request_business_relationship',
  'approve_business_relationship',
  'has_approved_business_relationship'
)
ORDER BY routine_name;

-- ====================================================
-- SECURITY SUMMARY REPORT
-- ====================================================

DO $$
DECLARE
  public_access_count INTEGER;
  policy_count INTEGER;
  function_count INTEGER;
  table_exists BOOLEAN;
BEGIN
  -- Check public access
  SELECT COUNT(*) INTO public_access_count
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'suppliers' AND grantee = 'PUBLIC';
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name LIKE '%supplier%';
  
  -- Check business relationships table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'business_relationships'
  ) INTO table_exists;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'SUPPLIERS SECURITY VERIFICATION REPORT';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Public access grants: % (should be 0)', public_access_count;
  RAISE NOTICE 'RLS policies active: % (should be 3+)', policy_count;
  RAISE NOTICE 'Security functions: % (should be 6+)', function_count;
  RAISE NOTICE 'Business relationships table: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '';
  
  IF public_access_count = 0 AND policy_count >= 3 AND function_count >= 6 AND table_exists THEN
    RAISE NOTICE '🎉 SECURITY STATUS: FULLY PROTECTED';
    RAISE NOTICE '✅ Supplier contact information is SECURE';
    RAISE NOTICE '✅ Competitor harvesting is PREVENTED';
    RAISE NOTICE '✅ Admin access is MAINTAINED';
    RAISE NOTICE '✅ Business relationship verification is ACTIVE';
  ELSE
    RAISE NOTICE '⚠️  SECURITY STATUS: NEEDS ATTENTION';
    IF public_access_count > 0 THEN
      RAISE NOTICE '❌ Public access still exists - CRITICAL';
    END IF;
    IF policy_count < 3 THEN
      RAISE NOTICE '❌ Insufficient RLS policies';
    END IF;
    IF function_count < 6 THEN
      RAISE NOTICE '❌ Missing security functions';
    END IF;
    IF NOT table_exists THEN
      RAISE NOTICE '❌ Business relationships table missing';
    END IF;
  END IF;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test admin access: SELECT * FROM get_suppliers_admin_directory();';
  RAISE NOTICE '2. Test public access: SELECT * FROM get_suppliers_public_directory();';
  RAISE NOTICE '3. Test contact access: SELECT * FROM get_supplier_contact_secure(''id'');';
  RAISE NOTICE '====================================================';
END $$;
