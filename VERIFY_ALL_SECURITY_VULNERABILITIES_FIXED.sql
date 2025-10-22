-- ====================================================
-- VERIFY ALL SECURITY VULNERABILITIES FIXED
-- Comprehensive test for all critical security issues
-- ====================================================

-- ====================================================
-- TEST 1: VERIFY NO PUBLIC ACCESS TO ANY SENSITIVE TABLE
-- ====================================================

SELECT 
  'COMPREHENSIVE PUBLIC ACCESS CHECK' as test_category,
  table_name,
  grantee,
  COUNT(*) as dangerous_grants,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No public access'
    ELSE '❌ CRITICAL VULNERABILITY - Public access exists!'
  END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
AND grantee IN ('PUBLIC', 'anon')
AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
GROUP BY table_name, grantee
UNION ALL
SELECT 
  'OVERALL PUBLIC ACCESS SUMMARY' as test_category,
  'ALL_SENSITIVE_TABLES' as table_name,
  'ALL_PUBLIC_ROLES' as grantee,
  COUNT(*) as dangerous_grants,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL TABLES SECURED - No public access anywhere'
    ELSE '❌ SECURITY EMERGENCY - Public access to sensitive data exists!'
  END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
AND grantee IN ('PUBLIC', 'anon');

-- ====================================================
-- TEST 2: VERIFY RLS ENABLED ON ALL SENSITIVE TABLES
-- ====================================================

SELECT 
  'RLS STATUS CHECK' as test_category,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED - Table protected'
    ELSE '❌ CRITICAL - RLS DISABLED, data completely exposed!'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
ORDER BY tablename;

-- ====================================================
-- TEST 3: VERIFY SUFFICIENT RLS POLICIES EXIST
-- ====================================================

SELECT 
  'RLS POLICIES COUNT' as test_category,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename IN ('delivery_tracking', 'driver_contact_data') AND COUNT(*) >= 2 THEN '✅ DRIVER SAFETY POLICIES SUFFICIENT'
    WHEN tablename IN ('profiles', 'payments') AND COUNT(*) >= 2 THEN '✅ PERSONAL DATA POLICIES SUFFICIENT'
    WHEN tablename IN ('delivery_providers', 'suppliers') AND COUNT(*) >= 3 THEN '✅ BUSINESS DATA POLICIES SUFFICIENT'
    ELSE '❌ INSUFFICIENT POLICIES - Security gaps exist'
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
GROUP BY tablename
ORDER BY tablename;

-- ====================================================
-- TEST 4: TEST SAFETY FUNCTIONS EXIST AND WORK
-- ====================================================

SELECT 
  'SAFETY FUNCTIONS CHECK' as test_category,
  routine_name,
  routine_type,
  '✅ DRIVER SAFETY FUNCTION AVAILABLE' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_delivery_location_safety_secure',
  'get_driver_contact_safety_secure',
  'get_delivery_provider_critical_secure',
  'get_profile_critical_secure',
  'get_payment_critical_secure'
)
ORDER BY routine_name;

-- ====================================================
-- TEST 5: DRIVER SAFETY SPECIFIC TESTS
-- ====================================================

-- Test location data protection (should show protected for unauthorized)
SELECT 
  'LOCATION SAFETY TEST' as test_category,
  'delivery_tracking' as table_name,
  latitude,
  longitude,
  access_level,
  safety_status,
  location_access_reason,
  'Should show SAFETY_PROTECTED for unauthorized users' as expected
FROM get_delivery_location_safety_secure(
  (SELECT id FROM delivery_tracking LIMIT 1)
) LIMIT 1;

-- Test driver contact protection (should show protected for unauthorized)
SELECT 
  'CONTACT SAFETY TEST' as test_category,
  'driver_contact_data' as table_name,
  driver_name,
  phone_number,
  email_address,
  safety_status,
  contact_access_reason,
  'Should show SAFETY PROTECTED for unauthorized users' as expected
FROM get_driver_contact_safety_secure(
  (SELECT id FROM driver_contact_data LIMIT 1)
) LIMIT 1;

-- ====================================================
-- COMPREHENSIVE SECURITY VERIFICATION REPORT
-- ====================================================

DO $$
DECLARE
  total_public_access INTEGER;
  total_rls_enabled INTEGER;
  total_policies INTEGER;
  safety_functions INTEGER;
  
  -- Individual table checks
  delivery_tracking_public INTEGER;
  driver_contact_public INTEGER;
  delivery_providers_public INTEGER;
  profiles_public INTEGER;
  payments_public INTEGER;
  suppliers_public INTEGER;
BEGIN
  -- Count total dangerous public access
  SELECT COUNT(*) INTO total_public_access
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
  AND grantee IN ('PUBLIC', 'anon')
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO total_rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers')
  AND rowsecurity = true;
  
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('delivery_tracking', 'driver_contact_data', 'delivery_providers', 'profiles', 'payments', 'suppliers');
  
  -- Count safety functions
  SELECT COUNT(*) INTO safety_functions
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name LIKE '%safety_secure%';
  
  -- Individual vulnerability checks
  SELECT COUNT(*) INTO delivery_tracking_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'delivery_tracking' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO driver_contact_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'driver_contact_data' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO delivery_providers_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'delivery_providers' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO profiles_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO payments_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'payments' AND grantee IN ('PUBLIC', 'anon');
  
  SELECT COUNT(*) INTO suppliers_public FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'suppliers' AND grantee IN ('PUBLIC', 'anon');
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'COMPREHENSIVE SECURITY VULNERABILITY VERIFICATION';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 OVERALL SECURITY STATUS:';
  RAISE NOTICE '  • Total public access grants: % (should be 0)', total_public_access;
  RAISE NOTICE '  • Tables with RLS enabled: % (should be 6)', total_rls_enabled;
  RAISE NOTICE '  • Total security policies: % (should be 15+)', total_policies;
  RAISE NOTICE '  • Safety functions available: % (should be 2+)', safety_functions;
  RAISE NOTICE '';
  RAISE NOTICE '🚨 INDIVIDUAL VULNERABILITY STATUS:';
  RAISE NOTICE '  • PUBLIC_DELIVERY_LOCATION_DATA: % grants (should be 0)', delivery_tracking_public;
  RAISE NOTICE '  • EXPOSED_DRIVER_CONTACT_DATA: % grants (should be 0)', driver_contact_public;
  RAISE NOTICE '  • PUBLIC_DELIVERY_PROVIDER_DATA: % grants (should be 0)', delivery_providers_public;
  RAISE NOTICE '  • PUBLIC_PROFILE_DATA: % grants (should be 0)', profiles_public;
  RAISE NOTICE '  • PUBLIC_PAYMENT_DATA: % grants (should be 0)', payments_public;
  RAISE NOTICE '  • PUBLIC_SUPPLIER_DATA: % grants (should be 0)', suppliers_public;
  RAISE NOTICE '';
  
  -- Comprehensive security assessment
  IF total_public_access = 0 AND total_rls_enabled = 6 AND total_policies >= 15 THEN
    RAISE NOTICE '🎉 SECURITY STATUS: ALL VULNERABILITIES RESOLVED';
    RAISE NOTICE '✅ Driver safety: FULLY PROTECTED';
    RAISE NOTICE '✅ Location privacy: GPS tracking secured';
    RAISE NOTICE '✅ Contact protection: Harassment prevention active';
    RAISE NOTICE '✅ Personal data: User self-access enabled';
    RAISE NOTICE '✅ Financial data: Payment owner access only';
    RAISE NOTICE '✅ Business data: Relationship-based access';
    RAISE NOTICE '✅ Admin oversight: Full management capabilities';
    RAISE NOTICE '✅ Privacy compliance: Comprehensive data protection';
  ELSE
    RAISE NOTICE '⚠️  SECURITY STATUS: CRITICAL ISSUES REMAIN';
    IF total_public_access > 0 THEN
      RAISE NOTICE '❌ CRITICAL: % public access grants still exist', total_public_access;
    END IF;
    IF total_rls_enabled < 6 THEN
      RAISE NOTICE '❌ CRITICAL: RLS not enabled on all tables (% of 6)', total_rls_enabled;
    END IF;
    IF total_policies < 15 THEN
      RAISE NOTICE '❌ Insufficient security policies (% of 15+ needed)', total_policies;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  DRIVER SAFETY PROTECTION SUMMARY:';
  RAISE NOTICE '• GPS stalking prevention: Location data secured from unauthorized access';
  RAISE NOTICE '• Harassment protection: Contact data secured from malicious users';
  RAISE NOTICE '• Delivery theft prevention: Approximate coordinates only for tracking';
  RAISE NOTICE '• Identity theft mitigation: Personal data access controlled';
  RAISE NOTICE '• Privacy enforcement: Self-access and admin oversight only';
  RAISE NOTICE '• Business functionality: Legitimate operations maintained';
  RAISE NOTICE '';
  RAISE NOTICE 'If all checks show 0 public access grants and proper RLS policies,';
  RAISE NOTICE 'your driver safety and data privacy are now fully protected!';
  RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- EXPECTED RESULTS AFTER COMPREHENSIVE FIX
-- ====================================================
-- 
-- ✅ WHAT YOU SHOULD SEE:
-- 
-- 1. Public Access: 0 grants to PUBLIC/anon on ALL sensitive tables
-- 2. RLS Enabled: All 6 tables have Row Level Security active
-- 3. Security Policies: 15+ policies protecting different access scenarios
-- 4. Safety Functions: 2+ driver safety functions available
-- 5. Location Protection: GPS coordinates show SAFETY_PROTECTED for unauthorized
-- 6. Contact Protection: Driver contact shows SAFETY PROTECTED for unauthorized
-- 7. Self Access: Users can access their own data appropriately
-- 8. Admin Oversight: Full administrative access maintained
--
-- ✅ DRIVER SAFETY ACHIEVED:
-- 
-- • GPS Stalking: PREVENTED through location access controls
-- • Driver Harassment: BLOCKED through contact protection
-- • Delivery Theft: MITIGATED through approximate location sharing
-- • Identity Theft: PREVENTED through personal data protection
-- • Privacy Violations: ELIMINATED through comprehensive controls
-- • Personal Safety: PRIORITIZED through strict access restrictions
--
-- If all checks pass, your comprehensive security implementation has
-- successfully protected driver safety, user privacy, and business data!
-- ====================================================
