-- ===================================================================
-- CRITICAL SECURITY FIX: Proper Anonymous Blocker for Profiles
-- ===================================================================
-- Issue: Existing profiles_block_all_anonymous policy is PERMISSIVE,
-- not RESTRICTIVE. PERMISSIVE policies are OR'd together, so they don't
-- act as a hard block. We need a RESTRICTIVE policy that enforces
-- authentication as a mandatory requirement.
-- ===================================================================

-- 1. Drop the incorrect PERMISSIVE policy
DROP POLICY IF EXISTS "profiles_block_all_anonymous" ON profiles;

-- 2. Create a proper RESTRICTIVE policy that blocks anonymous access
-- RESTRICTIVE policies are AND'd with PERMISSIVE ones, creating a hard requirement
CREATE POLICY "profiles_require_authentication" 
ON profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Verify the fix
DO $$
DECLARE
  restrictive_policy_exists boolean;
  restrictive_count int;
  policy_count int;
BEGIN
  -- Check that the restrictive policy exists
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_require_authentication'
    AND permissive = 'RESTRICTIVE'
  ) INTO restrictive_policy_exists;
  
  IF NOT restrictive_policy_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Restrictive authentication policy not created!';
  END IF;
  
  -- Count restrictive policies
  SELECT COUNT(*) INTO restrictive_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND permissive = 'RESTRICTIVE';
  
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  RAISE NOTICE '✓ SECURITY FIX APPLIED: Anonymous access properly blocked';
  RAISE NOTICE '  - Replaced PERMISSIVE with RESTRICTIVE authentication policy';
  RAISE NOTICE '  - Restrictive policies: % (enforces authentication)', restrictive_count;
  RAISE NOTICE '  - Total policies: %', policy_count;
  RAISE NOTICE '  - Anonymous users now HARD BLOCKED from all profile access';
END $$;