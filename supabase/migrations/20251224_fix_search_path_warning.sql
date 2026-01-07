-- =====================================================================
-- FIX FUNCTION SEARCH PATH MUTABLE WARNING
-- =====================================================================
-- This migration fixes the Supabase Security Advisor warning:
-- "Function public.update_admin_login_stats has a role mutable search_path"
-- 
-- The fix adds SET search_path = public to make the search path immutable
-- =====================================================================

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.update_admin_login_stats(TEXT);

CREATE OR REPLACE FUNCTION public.update_admin_login_stats(admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_staff 
  SET 
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE email = admin_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_admin_login_stats(TEXT) TO authenticated;

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed update_admin_login_stats function with immutable search_path';
END $$;









