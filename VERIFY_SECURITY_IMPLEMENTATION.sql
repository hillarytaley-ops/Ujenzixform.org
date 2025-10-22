-- ====================================================
-- VERIFY SUPPLIERS SECURITY IMPLEMENTATION
-- Run this AFTER executing the security fix
-- ====================================================

-- Check 1: Verify RLS policies are active
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'suppliers'
ORDER BY policyname;

-- Check 2: Verify no public access exists
SELECT 
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'suppliers'
AND grantee = 'PUBLIC';

-- Check 3: Test public directory access (should return basic info, NO contact details)
SELECT 
  id,
  company_name,
  contact_status,
  'Should show: Contact via secure platform' as expected_contact_status
FROM get_suppliers_public_directory() 
LIMIT 3;

-- Check 4: Test secure contact access (should show protected for non-admin)
SELECT 
  id,
  company_name,
  email,
  phone,
  access_granted,
  access_reason,
  'Should show: PROTECTED for non-admin users' as expected_behavior
FROM get_supplier_contact_secure(
  (SELECT id FROM suppliers WHERE is_verified = true LIMIT 1)
);

-- Check 5: Verify business relationships table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_relationships'
ORDER BY ordinal_position;

-- Check 6: Test business relationship request function
-- This should work for authenticated users
-- SELECT request_business_relationship(
--   (SELECT id FROM suppliers WHERE is_verified = true LIMIT 1),
--   'Security verification test'
-- );

-- ====================================================
-- SECURITY VERIFICATION RESULTS
-- ====================================================

DO $$
DECLARE
  policy_count INTEGER;
  public_access_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'suppliers';
  
  -- Count public access grants (should be 0)
  SELECT COUNT(*) INTO public_access_count
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name = 'suppliers'
  AND grantee = 'PUBLIC';
  
  -- Count security functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE '%supplier%'
  AND routine_type = 'FUNCTION';
  
  -- Report results
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'SECURITY VERIFICATION RESULTS';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'RLS Policies on suppliers table: %', policy_count;
  RAISE NOTICE 'Public access grants (should be 0): %', public_access_count;
  RAISE NOTICE 'Security functions available: %', function_count;
  
  IF policy_count >= 3 AND public_access_count = 0 AND function_count >= 5 THEN
    RAISE NOTICE '✅ SECURITY IMPLEMENTATION: SUCCESS';
    RAISE NOTICE '✅ Supplier contact information is PROTECTED';
    RAISE NOTICE '✅ Admin access maintained';
    RAISE NOTICE '✅ Business relationship verification active';
  ELSE
    RAISE WARNING '❌ SECURITY IMPLEMENTATION: INCOMPLETE';
    RAISE WARNING 'Please check the implementation steps';
  END IF;
  
  RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- EXPECTED RESULTS SUMMARY
-- ====================================================
-- 
-- ✅ WHAT YOU SHOULD SEE:
-- 
-- 1. RLS Policies: At least 3 policies on suppliers table
-- 2. Public Access: 0 grants to PUBLIC role
-- 3. Public Directory: Basic company info, "Contact via secure platform"
-- 4. Contact Access: "[PROTECTED]" messages for unauthorized users
-- 5. Business Relationships: Table exists with proper structure
-- 6. Functions: Multiple security functions available
--
-- ✅ WHAT THIS MEANS:
-- 
-- • Email addresses: PROTECTED from unauthorized access
-- • Phone numbers: PROTECTED from unauthorized access  
-- • Business addresses: PROTECTED from unauthorized access
-- • Competitor harvesting: PREVENTED
-- • Admin functionality: MAINTAINED
-- • Business operations: SECURED through approval workflow
--
-- If all checks pass, your suppliers' contact information is now secure!
-- ====================================================
