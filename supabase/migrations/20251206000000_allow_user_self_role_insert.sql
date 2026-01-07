-- ================================================================
-- ALLOW USERS TO INSERT THEIR OWN ROLE (SELF-REGISTRATION)
-- ================================================================
-- Issue: Users cannot insert their own role during registration
-- because the RLS policy only allows admins to insert roles.
-- 
-- This migration adds a policy to allow authenticated users to
-- insert their own role, but only if they don't already have one.
-- ================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "user_roles_self_insert" ON public.user_roles;
DROP POLICY IF EXISTS "users_can_insert_own_role" ON public.user_roles;

-- ================================================================
-- ALLOW USERS TO INSERT THEIR OWN ROLE (ONCE)
-- Users can only insert a role for themselves, and only if they
-- don't already have a role assigned.
-- ================================================================
CREATE POLICY "users_can_insert_own_role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can only insert for yourself
  user_id = auth.uid()
  -- And only if you don't already have a role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

-- ================================================================
-- VERIFICATION
-- ================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_roles'
  AND policyname = 'users_can_insert_own_role';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Policy users_can_insert_own_role was not created!';
  END IF;
  
  RAISE NOTICE 'Successfully created users_can_insert_own_role policy';
END $$;

-- Log all user_roles policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== Current user_roles policies ===';
  FOR policy_record IN 
    SELECT policyname, cmd, permissive
    FROM pg_policies
    WHERE tablename = 'user_roles'
  LOOP
    RAISE NOTICE 'Policy: %, Command: %, Permissive: %', 
      policy_record.policyname, 
      policy_record.cmd, 
      policy_record.permissive;
  END LOOP;
END $$;






