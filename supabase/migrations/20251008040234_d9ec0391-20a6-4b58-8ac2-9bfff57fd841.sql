-- ============================================================
-- FIX: Replace profiles_safe_for_joins VIEW with SECURITY DEFINER FUNCTION
-- Issue: Views can't have RLS policies, so we use a function instead
-- ============================================================

-- 1. Drop the insecure view
DROP VIEW IF EXISTS public.profiles_safe_for_joins;

-- 2. Create security definer function (controlled access)
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
  -- Block anonymous users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Return safe profile data for authenticated users
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
  FROM profiles p;
  -- Explicitly excludes: phone_number, email, business_license
END;
$$;

-- 3. Add usage comment
COMMENT ON FUNCTION get_profiles_safe_for_joins IS 'Secure function to fetch profiles without sensitive data - replaces profiles_safe_for_joins view. Requires authentication.';

-- 4. Log security fix
INSERT INTO public.security_events (
  event_type, severity, details
) VALUES (
  'profiles_safe_view_replaced_with_function',
  'low',
  jsonb_build_object(
    'vulnerability_fixed', 'Public exposure via VIEW - replaced with SECURITY DEFINER function',
    'access_control', 'Requires authentication',
    'timestamp', NOW()
  )
);