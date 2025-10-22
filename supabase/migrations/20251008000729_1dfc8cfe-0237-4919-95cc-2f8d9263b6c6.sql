-- SECURITY FIX: Consolidate profiles SELECT policies into single RESTRICTIVE policy
-- Issue: Multiple overlapping PERMISSIVE policies create security risks

-- Drop the duplicate/overlapping SELECT policies
DROP POLICY IF EXISTS "profiles_owner_read_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_and_admin_only" ON public.profiles;

-- Create single, clear RESTRICTIVE policy for SELECT
CREATE POLICY "profiles_strict_self_or_admin" ON public.profiles
  FOR SELECT
  TO public
  USING (
    (auth.uid() IS NOT NULL) 
    AND 
    ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Log this security improvement
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  auth.uid(),
  'profiles_policy_consolidation',
  'high',
  jsonb_build_object(
    'action', 'consolidated_permissive_policies_to_single_restrictive',
    'removed_policies', jsonb_build_array('profiles_owner_read_only', 'profiles_owner_and_admin_only'),
    'created_policy', 'profiles_strict_self_or_admin',
    'reason', 'Multiple PERMISSIVE policies create security risks - consolidated to single clear policy',
    'timestamp', NOW()
  )
);

COMMENT ON POLICY "profiles_strict_self_or_admin" ON public.profiles IS 
'SECURITY: Users can only SELECT their own profile data. Admins can SELECT all profiles. This prevents phone number harvesting.';