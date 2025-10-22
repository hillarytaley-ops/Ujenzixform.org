-- Fix suppliers_directory_public security and remove coding errors
-- 1. Enable RLS on suppliers_directory_public if not already enabled
ALTER TABLE public.suppliers_directory_public ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "suppliers_directory_public_admin_only" ON public.suppliers_directory_public;

-- 3. Create admin-only access policy for suppliers_directory_public
CREATE POLICY "suppliers_directory_public_admin_only_access_2024" 
ON public.suppliers_directory_public
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Fix useSupplierStats hook error - create RPC function for supplier stats
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
  
  -- Return actual stats for admin users
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_suppliers,
    COUNT(CASE WHEN is_verified = true THEN 1 END)::bigint as verified_suppliers,
    COALESCE(AVG(rating), 0)::numeric as avg_rating
  FROM suppliers;
END;
$$;

-- 5. Log security fix completion
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SUPPLIERS_DIRECTORY_SECURITY_FIX_COMPLETE',
  'HIGH',
  jsonb_build_object(
    'action', 'Applied admin-only RLS policies to suppliers_directory_public',
    'tables_secured', ARRAY['suppliers_directory_public'],
    'functions_created', ARRAY['get_supplier_stats'],
    'timestamp', NOW(),
    'description', 'Fixed suppliers directory security and coding errors'
  )
);