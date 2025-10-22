-- CRITICAL SECURITY FIX: Remove overly permissive profiles RLS policy
-- This policy was allowing ANY authenticated user to access ALL profiles including phone numbers

-- Drop the dangerous policy that exposes phone numbers to all authenticated users
DROP POLICY IF EXISTS "profiles_require_authentication" ON public.profiles;

-- Log this critical security fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  auth.uid(),
  'critical_security_fix_profiles_phone_exposure',
  'critical',
  jsonb_build_object(
    'action', 'removed_overly_permissive_rls_policy',
    'policy_name', 'profiles_require_authentication',
    'vulnerability', 'phone_number_harvesting_by_authenticated_users',
    'fix_applied_at', NOW(),
    'remaining_policies', jsonb_build_array(
      'profiles_owner_read_only',
      'profiles_owner_and_admin_only',
      'profiles_owner_update',
      'profiles_owner_insert_only'
    )
  )
);

-- Verify existing strict policies are still in place:
-- These policies ensure users can only see their own profile or admins can see all:
-- 1. profiles_owner_read_only: SELECT for self OR admin
-- 2. profiles_owner_and_admin_only: SELECT for self OR admin (backup)
-- 3. profiles_owner_update: UPDATE for self only
-- 4. profiles_owner_insert_only: INSERT for self only

COMMENT ON TABLE public.profiles IS 'User profiles with strict RLS: users can only access their own profile data, admins can access all. Phone numbers are protected from harvesting.';