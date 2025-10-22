-- ============================================================
-- SECURITY FIX: Remove profiles_safe_for_joins VIEW
-- Replace with direct RPC calls to secure function
-- ============================================================

-- Drop the insecure view completely
DROP VIEW IF EXISTS public.profiles_safe_for_joins CASCADE;

-- The secure function get_profiles_safe_for_joins() already exists
-- Applications should call it via: supabase.rpc('get_profiles_safe_for_joins')

-- Log the security improvement
INSERT INTO public.security_events (
  event_type, severity, details
) VALUES (
  'profiles_safe_for_joins_view_removed',
  'low',
  jsonb_build_object(
    'fix', 'Removed public view, enforcing RPC-based access control',
    'access_method', 'Use supabase.rpc(''get_profiles_safe_for_joins'')',
    'security_benefit', 'Eliminates RLS policy bypass via views',
    'timestamp', NOW()
  )
);

COMMENT ON FUNCTION get_profiles_safe_for_joins IS 'Secure function - requires authentication, call via .rpc() method. Returns safe profile data excluding phone/email.';