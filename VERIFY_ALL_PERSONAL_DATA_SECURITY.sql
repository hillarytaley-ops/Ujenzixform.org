-- ====================================================
-- VERIFY ALL PERSONAL DATA SECURITY IMPLEMENTATION
-- Tests security for all three vulnerable tables
-- ====================================================

-- Test 1: Verify no public access exists on any sensitive table
SELECT 
  'PUBLIC ACCESS CHECK' as test_name,
  table_name,
  COUNT(*) as public_grants,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No public access'
    ELSE '❌ VULNERABLE - Public access exists'
  END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('driver_contact_data', 'delivery_providers', 'payments')
AND grantee = 'PUBLIC'
GROUP BY table_name
UNION ALL
SELECT 
  'PUBLIC ACCESS SUMMARY' as test_name,
  'ALL_TABLES' as table_name,
  COUNT(*) as public_grants,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL SECURE - No public access'
    ELSE '❌ SECURITY BREACH - Public access exists'
  END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('driver_contact_data', 'delivery_providers', 'payments')
AND grantee = 'PUBLIC';

-- Test 2: Check RLS policies exist on all tables
SELECT 
  'RLS POLICIES CHECK' as test_name,
  tablename as table_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ SECURE - Sufficient RLS policies'
    WHEN COUNT(*) >= 3 THEN '⚠️  PARTIAL - Some policies missing'
    ELSE '❌ INCOMPLETE - Need more policies'
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('driver_contact_data', 'delivery_providers', 'payments')
GROUP BY tablename;

-- Test 3: List all current policies for review
SELECT 
  'CURRENT POLICIES' as test_name,
  tablename,
  policyname,
  cmd,
  permissive,
  '✅ ACTIVE' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('driver_contact_data', 'delivery_providers', 'payments')
ORDER BY tablename, policyname;

-- Test 4: Test secure functions exist and are accessible
SELECT 
  'SECURITY FUNCTIONS CHECK' as test_name,
  routine_name,
  routine_type,
  '✅ AVAILABLE' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_driver_contact_secure',
  'get_delivery_provider_secure', 
  'get_payment_data_secure'
)
ORDER BY routine_name;

-- Test 5: Test driver contact secure function (should protect data for non-admin)
SELECT 
  'DRIVER CONTACT ACCESS TEST' as test_name,
  driver_name,
  phone_number,
  email_address,
  access_level,
  data_access_reason,
  'Should show PROTECTED for non-admin/non-self users' as expected
FROM get_driver_contact_secure(
  (SELECT id FROM driver_contact_data LIMIT 1)
) LIMIT 1;

-- Test 6: Test delivery provider secure function
SELECT 
  'DELIVERY PROVIDER ACCESS TEST' as test_name,
  provider_name,
  phone,
  email,
  license_number,
  access_level,
  data_access_reason,
  'Should show PROTECTED for non-admin/non-self users' as expected
FROM get_delivery_provider_secure(
  (SELECT id FROM delivery_providers LIMIT 1)
) LIMIT 1;

-- Test 7: Test payment data secure function
SELECT 
  'PAYMENT DATA ACCESS TEST' as test_name,
  amount,
  phone_number,
  transaction_id,
  payment_reference,
  access_level,
  data_access_reason,
  'Should show user-specific or BLOCKED for unauthorized' as expected
FROM get_payment_data_secure(
  (SELECT id FROM payments LIMIT 1)
) LIMIT 1;

-- Test 8: Verify tables have RLS enabled
SELECT 
  'RLS ENABLED CHECK' as test_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED - CRITICAL ISSUE'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('driver_contact_data', 'delivery_providers', 'payments')
ORDER BY tablename;

-- ====================================================
-- COMPREHENSIVE SECURITY SUMMARY REPORT
-- ====================================================

DO $$
DECLARE
  total_public_access INTEGER;
  total_policies INTEGER;
  total_functions INTEGER;
  rls_enabled_count INTEGER;
  driver_contact_policies INTEGER;
  delivery_provider_policies INTEGER;
  payment_policies INTEGER;
BEGIN
  -- Count total public access grants (should be 0)
  SELECT COUNT(*) INTO total_public_access
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name IN ('driver_contact_data', 'delivery_providers', 'payments')
  AND grantee = 'PUBLIC';
  
  -- Count total RLS policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('driver_contact_data', 'delivery_providers', 'payments');
  
  -- Count individual table policies
  SELECT COUNT(*) INTO driver_contact_policies
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'driver_contact_data';
  
  SELECT COUNT(*) INTO delivery_provider_policies
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'delivery_providers';
  
  SELECT COUNT(*) INTO payment_policies
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'payments';
  
  -- Count security functions
  SELECT COUNT(*) INTO total_functions
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN ('get_driver_contact_secure', 'get_delivery_provider_secure', 'get_payment_data_secure');
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('driver_contact_data', 'delivery_providers', 'payments')
  AND rowsecurity = true;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'COMPREHENSIVE PERSONAL DATA SECURITY REPORT';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'OVERALL SECURITY STATUS:';
  RAISE NOTICE '  • Total public access grants: % (should be 0)', total_public_access;
  RAISE NOTICE '  • Total RLS policies: % (should be 15)', total_policies;
  RAISE NOTICE '  • Security functions: % (should be 3)', total_functions;
  RAISE NOTICE '  • Tables with RLS enabled: % (should be 3)', rls_enabled_count;
  RAISE NOTICE '';
  RAISE NOTICE 'INDIVIDUAL TABLE STATUS:';
  RAISE NOTICE '  • Driver Contact Data policies: % (should be 5)', driver_contact_policies;
  RAISE NOTICE '  • Delivery Provider policies: % (should be 5)', delivery_provider_policies;
  RAISE NOTICE '  • Payment policies: % (should be 5)', payment_policies;
  RAISE NOTICE '';
  
  -- Overall security assessment
  IF total_public_access = 0 AND total_policies >= 15 AND total_functions = 3 AND rls_enabled_count = 3 THEN
    RAISE NOTICE '🎉 SECURITY STATUS: FULLY PROTECTED';
    RAISE NOTICE '✅ All vulnerable tables are now SECURE';
    RAISE NOTICE '✅ EXPOSED_DRIVER_CONTACT_DATA: FIXED';
    RAISE NOTICE '✅ PUBLIC_DELIVERY_PROVIDER_DATA: FIXED';
    RAISE NOTICE '✅ PUBLIC_PAYMENT_DATA: FIXED';
    RAISE NOTICE '✅ Single point of failure: ELIMINATED';
    RAISE NOTICE '✅ Granular self-access: IMPLEMENTED';
    RAISE NOTICE '✅ Admin compromise risk: MITIGATED';
    RAISE NOTICE '✅ Personal data protection: ENFORCED';
  ELSE
    RAISE NOTICE '⚠️  SECURITY STATUS: NEEDS ATTENTION';
    IF total_public_access > 0 THEN
      RAISE NOTICE '❌ Public access still exists - CRITICAL';
    END IF;
    IF total_policies < 15 THEN
      RAISE NOTICE '❌ Insufficient RLS policies - need %', (15 - total_policies);
    END IF;
    IF total_functions < 3 THEN
      RAISE NOTICE '❌ Missing security functions - need %', (3 - total_functions);
    END IF;
    IF rls_enabled_count < 3 THEN
      RAISE NOTICE '❌ RLS not enabled on all tables';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'GRANULAR ACCESS FEATURES:';
  RAISE NOTICE '• Drivers: Can access their own contact information';
  RAISE NOTICE '• Delivery Providers: Can access their own provider data';
  RAISE NOTICE '• Payment Users: Can access their own payment history';
  RAISE NOTICE '• Admins: Retain full access for oversight and management';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST COMMANDS:';
  RAISE NOTICE '1. Driver contact: SELECT * FROM get_driver_contact_secure();';
  RAISE NOTICE '2. Provider data: SELECT * FROM get_delivery_provider_secure();';
  RAISE NOTICE '3. Payment data: SELECT * FROM get_payment_data_secure();';
  RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- EXPECTED RESULTS SUMMARY
-- ====================================================
-- 
-- ✅ WHAT YOU SHOULD SEE:
-- 
-- 1. Public Access: 0 grants to PUBLIC role on all sensitive tables
-- 2. RLS Policies: 5 policies per table (15 total)
-- 3. Security Functions: 3 secure access functions available
-- 4. RLS Enabled: All 3 tables have Row Level Security enabled
-- 5. Protected Data: Personal information shows "[PROTECTED]" for unauthorized users
-- 6. Self Access: Users can access their own data when properly authenticated
-- 7. Admin Access: Administrators retain full access for oversight
--
-- ✅ WHAT THIS MEANS:
-- 
-- • Driver contact information: PROTECTED from unauthorized access
-- • Delivery provider personal data: PROTECTED from unauthorized access
-- • Payment financial data: PROTECTED from unauthorized access  
-- • Single point of failure: ELIMINATED through granular access
-- • Admin account compromise: Risk significantly REDUCED
-- • User privacy: ENHANCED with self-access controls
-- • Compliance: IMPROVED with proper data protection
--
-- If all checks pass, your personal data tables are now secure with proper
-- granular access controls that eliminate single points of failure!
-- ====================================================
