-- ============================================================
-- FIX: profiles_safe_for_joins - Replace VIEW with SECURE FUNCTION
-- Issue: Views cannot have RLS policies, need function-based access control
-- ============================================================

-- 1. Drop the insecure view
DROP VIEW IF EXISTS public.profiles_safe_for_joins;

-- 2. Create secure function replacement
CREATE OR REPLACE FUNCTION public.get_profiles_safe_for_joins()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  company_logo_url TEXT,
  user_type TEXT,
  is_professional BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block anonymous access
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view profiles';
  END IF;
  
  -- Return safe profile data (no phone/email)
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.company_name,
    p.avatar_url,
    p.company_logo_url,
    p.user_type,
    p.is_professional,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id IS NOT NULL; -- Basic filter, can add more restrictions
END;
$$;

-- 3. For backward compatibility, recreate view that calls the function
-- This way existing JOINs still work, but access is controlled
CREATE OR REPLACE VIEW public.profiles_safe_for_joins AS
SELECT * FROM get_profiles_safe_for_joins();

-- Set security_invoker so it checks caller's auth
ALTER VIEW profiles_safe_for_joins SET (security_invoker = true);

-- 4. Log the security fix
INSERT INTO public.security_events (
  event_type, severity, details
) VALUES (
  'profiles_safe_for_joins_secured',
  'low',
  jsonb_build_object(
    'fix', 'Replaced insecure view with SECURITY DEFINER function',
    'vulnerability_fixed', 'Anonymous access to profile data blocked',
    'access_control', 'Authentication required',
    'timestamp', NOW()
  )
);

-- 5. Add comments
COMMENT ON FUNCTION get_profiles_safe_for_joins IS 'Secure function - blocks anonymous access, returns safe profile data for JOINs';
COMMENT ON VIEW profiles_safe_for_joins IS 'Secure view wrapper for get_profiles_safe_for_joins() function - requires authentication';