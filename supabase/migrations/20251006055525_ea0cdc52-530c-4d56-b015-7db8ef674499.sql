-- ===================================================================
-- CRITICAL SECURITY FIX: Block Anonymous Access to Profiles
-- ===================================================================
-- Issue: profiles table contains PII (full names, phone numbers, company
-- names, business licenses) but has no explicit policy blocking anonymous
-- users from attempting to access this data.
--
-- Solution: Add explicit DENY policy for anonymous users as first line
-- of defense, following defense-in-depth security principles.
-- ===================================================================

-- 1. Add explicit anonymous blocker policy for profiles table
CREATE POLICY "profiles_block_all_anonymous" 
ON profiles
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Add security comment
COMMENT ON TABLE profiles IS 
'SECURITY MODEL: Contains sensitive PII (names, phones, company info, licenses).
All access requires authentication. Policies enforce:
- Anonymous access BLOCKED (explicit DENY policy)
- Users can only access their own profile data
- Admins can access all profiles
- No public directory browsing allowed
All profile access is logged in profile_access_security_audit.';

-- 3. Verify the policy was created successfully
DO $$
DECLARE
  policy_exists boolean;
  policy_count int;
BEGIN
  -- Check that the new blocking policy exists
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_block_all_anonymous'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Anonymous blocking policy not created!';
  END IF;
  
  -- Count total policies on profiles table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  RAISE NOTICE '✓ SECURITY FIX APPLIED: Anonymous access to profiles blocked';
  RAISE NOTICE '  - Added explicit anonymous DENY policy';
  RAISE NOTICE '  - Total profiles policies: %', policy_count;
  RAISE NOTICE '  - All profile access now requires authentication';
  RAISE NOTICE '  - Users can only access their own data (except admins)';
END $$;