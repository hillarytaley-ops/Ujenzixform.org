-- Fix suppliers directory security with correct severity value
-- 1. Drop the suppliers_directory_public view since it can't have RLS
DROP VIEW IF EXISTS public.suppliers_directory_public;

-- 2. Create secure function to get supplier stats (fixes coding error)
CREATE OR REPLACE FUNCTION public.get_supplier_stats()
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
  
  -- Return actual stats for admin users
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_suppliers,
    COUNT(CASE WHEN is_verified = true THEN 1 END)::bigint as verified_suppliers,
    COALESCE(AVG(rating), 0)::numeric as avg_rating
  FROM suppliers;
END;
$$;

-- 3. Create secure function to get safe supplier directory (admin only)
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_status text,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  specialties text[],
  materials_offered text[],
  rating numeric
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
  
  -- Only admins can access suppliers directory
  IF current_user_role != 'admin' THEN
    -- Return empty result for non-admin users
    RETURN;
  END IF;
  
  -- Return suppliers data for admin users only
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    'contact_protected'::text as contact_status,
    s.is_verified,
    s.created_at,
    s.updated_at,
    s.specialties,
    s.materials_offered,
    s.rating
  FROM suppliers s
  ORDER BY s.company_name;
END;
$$;

-- 4. Log security fix completion with correct severity
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SUPPLIERS_DIRECTORY_SECURITY_COMPLETE',
  'critical',
  jsonb_build_object(
    'action', 'Removed insecure suppliers_directory_public view and created admin-only functions',
    'functions_created', ARRAY['get_supplier_stats', 'get_suppliers_directory_safe'],
    'timestamp', NOW(),
    'description', 'Fixed all suppliers directory security issues and coding errors'
  )
);