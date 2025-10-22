-- Security Fix: Implement RLS for all exposed views and tables (CORRECTED)

-- Fix 1: Secure profiles_business_directory view
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory 
WITH (security_barrier = true) AS
SELECT 
  id,
  full_name,
  company_name,
  user_type,
  is_professional,
  role,
  created_at
FROM profiles
WHERE (is_professional = true OR user_type = 'company')
AND auth.uid() IS NOT NULL;

-- Fix 2: Secure suppliers_public_directory view
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory 
WITH (security_barrier = true) AS
SELECT 
  id,
  company_name,
  is_verified,
  rating,
  specialties,
  materials_offered,
  created_at
FROM suppliers
WHERE is_verified = true
AND auth.uid() IS NOT NULL
AND (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (is_professional = true OR user_type = 'company')
  )
);

-- Fix 3: Replace deliveries_safe view with secure function
DROP VIEW IF EXISTS public.deliveries_safe CASCADE;

CREATE OR REPLACE FUNCTION public.get_deliveries_safe()
RETURNS TABLE(
  id uuid,
  quantity integer,
  weight_kg numeric,
  pickup_date date,
  delivery_date date,
  estimated_delivery_time timestamp with time zone,
  actual_delivery_time timestamp with time zone,
  supplier_id uuid,
  builder_id uuid,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  tracking_number text,
  material_type text,
  pickup_address text,
  delivery_address text,
  status text,
  vehicle_details text,
  notes text,
  driver_name text,
  driver_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  current_user_profile_id uuid;
BEGIN
  -- Get user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin sees all
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY
    SELECT d.* FROM deliveries d;
    RETURN;
  END IF;
  
  -- Builder sees their own
  IF current_user_role = 'builder' THEN
    RETURN QUERY
    SELECT d.* FROM deliveries d
    WHERE d.builder_id = current_user_profile_id;
    RETURN;
  END IF;
  
  -- Supplier sees their deliveries
  IF current_user_role = 'supplier' THEN
    RETURN QUERY
    SELECT d.* FROM deliveries d
    WHERE d.supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    );
    RETURN;
  END IF;
  
  -- Provider sees active deliveries
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid()) THEN
    RETURN QUERY
    SELECT d.* FROM deliveries d
    WHERE d.status IN ('in_progress', 'out_for_delivery')
    AND EXISTS (
      SELECT 1 FROM delivery_providers dp
      JOIN delivery_requests dr ON dr.provider_id = dp.id
      WHERE dp.user_id = auth.uid()
      AND dr.builder_id = d.builder_id
      AND dr.status = 'accepted'
    );
    RETURN;
  END IF;
  
  -- No access for others
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_deliveries_safe() TO authenticated;

-- Fix 4: Secure driver_contact_access_log table
ALTER TABLE public.driver_contact_access_log FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view driver contact access logs" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_admin_read" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_system_insert" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_no_update" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_no_delete" ON public.driver_contact_access_log;

-- Admin read only
CREATE POLICY "driver_contact_log_admin_read" 
ON public.driver_contact_access_log 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System insert for audit trail
CREATE POLICY "driver_contact_log_system_insert" 
ON public.driver_contact_access_log 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Prevent tampering
CREATE POLICY "driver_contact_log_no_update" 
ON public.driver_contact_access_log 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "driver_contact_log_no_delete" 
ON public.driver_contact_access_log 
FOR DELETE 
TO authenticated
USING (false);