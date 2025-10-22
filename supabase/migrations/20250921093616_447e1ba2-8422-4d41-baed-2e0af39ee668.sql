-- Fix suppliers directory security - suppliers_directory_public is a view, so we need to fix the underlying table access
-- 1. First, let's remove the view entirely as it's exposing data without proper security
DROP VIEW IF EXISTS public.suppliers_directory_public;

-- 2. Create secure RPC function for supplier stats to fix coding error
CREATE OR REPLACE FUNCTION get_supplier_stats()
RETURNS TABLE(
  total_suppliers bigint,
  verified_suppliers bigint,  
  avg_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access supplier statistics
  IF current_user_role != 'admin' THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;
  
  -- Return actual stats for admin users only
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_suppliers,
    COUNT(CASE WHEN is_verified = true THEN 1 END)::bigint as verified_suppliers,
    COALESCE(AVG(rating), 0)::numeric as avg_rating
  FROM suppliers;
END;
$$;

-- 3. Log security fix
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SUPPLIERS_DIRECTORY_PUBLIC_VIEW_REMOVED',
  'CRITICAL',
  jsonb_build_object(
    'action', 'Removed suppliers_directory_public view for security',
    'reason', 'View was exposing supplier data without proper RLS protection',
    'replacement', 'Admin-only access through suppliers_directory_safe table',
    'timestamp', NOW()
  )
);