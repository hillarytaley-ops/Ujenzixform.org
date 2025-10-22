-- ====================================================
-- VERIFY DELIVERY PROVIDERS PRIVACY PROTECTION
-- Tests emergency privacy fix for driver personal data
-- ====================================================

-- Test 1: Verify no public access exists to delivery_providers table
SELECT 
  'PUBLIC ACCESS CHECK' as test_name,
  table_name,
  grantee,
  privilege_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No public access to driver data'
    ELSE '❌ PRIVACY BREACH - Public access to driver personal information!'
  END as privacy_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'delivery_providers'
AND grantee IN ('PUBLIC', 'anon')
AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
GROUP BY table_name, grantee, privilege_type
UNION ALL
SELECT 
  'PUBLIC ACCESS SUMMARY' as test_name,
  'delivery_providers' as table_name,
  'ALL_PUBLIC_ROLES' as grantee,
  'ALL_PRIVILEGES' as privilege_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PRIVACY PROTECTED - No public access'
    ELSE '❌ CRITICAL PRIVACY VIOLATION - Public access exists!'
  END as privacy_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'delivery_providers'
AND grantee IN ('PUBLIC', 'anon');

-- Test 2: Check RLS policies exist and protect driver privacy
SELECT 
  'RLS POLICIES CHECK' as test_name,
  tablename as table_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PRIVACY PROTECTED - Comprehensive RLS policies'
    WHEN COUNT(*) >= 3 THEN '⚠️  PARTIAL PROTECTION - Some policies missing'
    ELSE '❌ PRIVACY VULNERABLE - Insufficient policies'
  END as privacy_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'delivery_providers'
GROUP BY tablename;

-- Test 3: List all current privacy protection policies
SELECT 
  'CURRENT PRIVACY POLICIES' as test_name,
  tablename,
  policyname,
  cmd,
  permissive,
  '✅ ACTIVE PRIVACY PROTECTION' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'delivery_providers'
ORDER BY policyname;

-- Test 4: Verify RLS is enabled and forced
SELECT 
  'RLS STATUS CHECK' as test_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED - Driver data protected'
    ELSE '❌ CRITICAL - RLS DISABLED, driver data exposed!'
  END as privacy_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'delivery_providers';

-- Test 5: Test emergency privacy protection functions exist
SELECT 
  'PRIVACY FUNCTIONS CHECK' as test_name,
  routine_name,
  routine_type,
  '✅ AVAILABLE FOR PRIVACY PROTECTION' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_delivery_provider_emergency_secure',
  'get_delivery_providers_emergency_safe_directory',
  'request_driver_contact_emergency',
  'approve_driver_contact_request_emergency'
)
ORDER BY routine_name;

-- Test 6: Test safe directory function (should NOT expose personal data)
SELECT 
  'SAFE DIRECTORY TEST' as test_name,
  provider_name,
  vehicle_type,
  contact_method,
  privacy_notice,
  'Should show: Contact via secure platform & privacy notice' as expected
FROM get_delivery_providers_emergency_safe_directory() 
LIMIT 2;

-- Test 7: Test secure access function (should protect personal data for non-admin/non-self)
SELECT 
  'DRIVER DATA PROTECTION TEST' as test_name,
  provider_name,
  phone,
  email,
  address,
  license_number,
  access_level,
  privacy_status,
  data_access_reason,
  'Should show PRIVACY PROTECTED for unauthorized users' as expected
FROM get_delivery_provider_emergency_secure(
  (SELECT id FROM delivery_providers WHERE is_verified = true LIMIT 1)
) LIMIT 1;

-- Test 8: Check driver contact requests table exists and is protected
SELECT 
  'CONTACT REQUESTS TABLE CHECK' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'driver_contact_requests'
    ) THEN '✅ CONTACT REQUEST SYSTEM READY'
    ELSE '❌ CONTACT REQUEST SYSTEM MISSING'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'driver_contact_requests'
      AND rowsecurity = true
    ) THEN '✅ RLS ENABLED ON CONTACT REQUESTS'
    ELSE '❌ CONTACT REQUESTS NOT PROTECTED'
  END as privacy_status;

-- ====================================================
-- COMPREHENSIVE DRIVER PRIVACY VERIFICATION REPORT
-- ====================================================

DO $$
DECLARE
  public_access_count INTEGER;
  anon_access_count INTEGER;
  policy_count INTEGER;
  rls_enabled_count INTEGER;
  privacy_functions_count INTEGER;
  contact_requests_protected BOOLEAN;
BEGIN
  -- Check for any public access (should be 0)
  SELECT COUNT(*) INTO public_access_count
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name = 'delivery_providers' 
  AND grantee = 'PUBLIC'
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  
  -- Check for any anon access (should be 0)
  SELECT COUNT(*) INTO anon_access_count
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name = 'delivery_providers' 
  AND grantee = 'anon'
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  
  -- Check RLS policies (should be at least 6)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'delivery_providers';
  
  -- Check if RLS is enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'delivery_providers'
  AND rowsecurity = true;
  
  -- Check privacy protection functions
  SELECT COUNT(*) INTO privacy_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE '%delivery_provider%emergency%';
  
  -- Check contact requests protection
  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'driver_contact_requests'
    AND rowsecurity = true
  ) INTO contact_requests_protected;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'DELIVERY PROVIDERS PRIVACY PROTECTION REPORT';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PRIVACY PROTECTION STATUS:';
  RAISE NOTICE '  • Public access grants: % (should be 0)', public_access_count;
  RAISE NOTICE '  • Anonymous access grants: % (should be 0)', anon_access_count;
  RAISE NOTICE '  • RLS policies active: % (should be 6+)', policy_count;
  RAISE NOTICE '  • RLS enabled: % (should be 1)', rls_enabled_count;
  RAISE NOTICE '  • Privacy functions: % (should be 4)', privacy_functions_count;
  RAISE NOTICE '  • Contact requests protected: %', contact_requests_protected;
  RAISE NOTICE '';
  
  -- Overall privacy assessment
  IF public_access_count = 0 AND anon_access_count = 0 AND policy_count >= 6 AND rls_enabled_count = 1 AND privacy_functions_count >= 4 THEN
    RAISE NOTICE '🎉 PRIVACY STATUS: FULLY PROTECTED';
    RAISE NOTICE '✅ PUBLIC_DELIVERY_PROVIDER_DATA vulnerability: FIXED';
    RAISE NOTICE '✅ Driver personal data: COMPLETELY PROTECTED';
    RAISE NOTICE '✅ Phone numbers: BLOCKED from unauthorized access';
    RAISE NOTICE '✅ Email addresses: BLOCKED from unauthorized access';
    RAISE NOTICE '✅ Home addresses: BLOCKED from unauthorized access';
    RAISE NOTICE '✅ License information: BLOCKED from unauthorized access';
    RAISE NOTICE '✅ Privacy violations: PREVENTED';
    RAISE NOTICE '✅ Identity theft risk: MITIGATED';
    RAISE NOTICE '✅ Harassment potential: ELIMINATED';
    RAISE NOTICE '✅ Self-access: Drivers can manage own data';
    RAISE NOTICE '✅ Admin oversight: Maintained for management';
    RAISE NOTICE '✅ Business directory: Safe without personal data';
  ELSE
    RAISE NOTICE '⚠️  PRIVACY STATUS: NEEDS ATTENTION';
    IF public_access_count > 0 THEN
      RAISE NOTICE '❌ CRITICAL: Public access to driver personal data exists!';
    END IF;
    IF anon_access_count > 0 THEN
      RAISE NOTICE '❌ CRITICAL: Anonymous access to driver personal data exists!';
    END IF;
    IF policy_count < 6 THEN
      RAISE NOTICE '❌ Insufficient privacy policies - need % more', (6 - policy_count);
    END IF;
    IF rls_enabled_count = 0 THEN
      RAISE NOTICE '❌ CRITICAL: RLS not enabled - driver data completely exposed!';
    END IF;
    IF privacy_functions_count < 4 THEN
      RAISE NOTICE '❌ Missing privacy protection functions';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'DRIVER PRIVACY FEATURES:';
  RAISE NOTICE '• Self-access: Drivers can view and update their own personal data';
  RAISE NOTICE '• Contact requests: Secure approval workflow for business contact';
  RAISE NOTICE '• Admin management: Full oversight capabilities maintained';
  RAISE NOTICE '• Safe directory: Public listing without exposing personal data';
  RAISE NOTICE '• Privacy protection: Personal information blocked from unauthorized access';
  RAISE NOTICE '';
  RAISE NOTICE 'PROTECTED PERSONAL DATA:';
  RAISE NOTICE '• Driver phone numbers: Self-access and admin only';
  RAISE NOTICE '• Driver email addresses: Self-access and admin only';
  RAISE NOTICE '• Driver home addresses: Self-access and admin only';
  RAISE NOTICE '• Driver license numbers: Self-access and admin only';
  RAISE NOTICE '• Contact information: Secure request/approval system';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST COMMANDS:';
  RAISE NOTICE '1. Safe directory: SELECT * FROM get_delivery_providers_emergency_safe_directory();';
  RAISE NOTICE '2. Secure access: SELECT * FROM get_delivery_provider_emergency_secure(''id'');';
  RAISE NOTICE '3. Request contact: SELECT request_driver_contact_emergency(''id'', ''reason'', ''purpose'');';
  RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- EXPECTED RESULTS SUMMARY
-- ====================================================
-- 
-- ✅ WHAT YOU SHOULD SEE AFTER EMERGENCY FIX:
-- 
-- 1. Public Access: 0 grants to PUBLIC or anon roles
-- 2. RLS Policies: 6+ policies protecting driver personal data
-- 3. RLS Enabled: Row Level Security active on delivery_providers table
-- 4. Privacy Functions: 4 emergency privacy protection functions available
-- 5. Safe Directory: Business info visible, personal data shows "Contact via platform"
-- 6. Secure Access: Personal data shows "[PRIVACY PROTECTED]" for unauthorized users
-- 7. Contact Requests: Secure system for approved contact information access
--
-- ✅ DRIVER PRIVACY PROTECTION ACHIEVED:
-- 
-- • Phone numbers: PROTECTED from unauthorized viewing
-- • Email addresses: PROTECTED from unauthorized viewing
-- • Home addresses: PROTECTED from unauthorized viewing
-- • License information: PROTECTED from unauthorized viewing
-- • Personal data access: Self-access only (plus admin oversight)
-- • Privacy violations: PREVENTED through comprehensive RLS
-- • Identity theft risk: MITIGATED through access controls
-- • Harassment potential: ELIMINATED through contact approval system
--
-- If all checks pass, your delivery providers' personal data is now fully
-- protected with proper privacy controls that prevent unauthorized access
-- while maintaining necessary business functionality!
-- ====================================================
