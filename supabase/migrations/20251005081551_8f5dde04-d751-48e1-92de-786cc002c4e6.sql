
-- Fix security definer view issue
-- The user_profiles_with_role view should not use SECURITY DEFINER
-- Instead, users should query profiles and user_roles separately with proper RLS

DROP VIEW IF EXISTS public.user_profiles_with_role CASCADE;
DROP VIEW IF EXISTS public.user_profiles_with_display_role CASCADE;

-- Document the correct way to get user roles
COMMENT ON TABLE public.user_roles IS 
  'SECURITY: To display a user role, query this table directly with RLS protection. Example: SELECT role FROM user_roles WHERE user_id = auth.uid() ORDER BY CASE role WHEN ''admin'' THEN 1 ELSE 2 END LIMIT 1';

COMMENT ON FUNCTION public.has_role(_user_id uuid, _role app_role) IS
  'SECURITY: This is the ONLY function that should be used for authorization checks. Never check profiles.role or any other field for security decisions.';
