-- Security Fix: Implement RLS for all exposed views and tables
-- Fix 1: Secure profiles_business_directory view
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

-- Create secure function instead of public view
CREATE OR REPLACE FUNCTION public.get_profiles_business_directory()
RETURNS TABLE(
  id uuid,
  full_name text,
  company_name text,
  user_type text,
  is_professional boolean,
  role text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated professional users can access
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is authenticated professional/company
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (is_professional = true OR user_type = 'company' OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.company_name,
    p.user_type,
    p.is_professional,
    p.role,
    p.created_at
  FROM profiles p
  WHERE p.is_professional = true OR p.user_type = 'company';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_business_directory() TO authenticated;

-- Fix 2: Secure suppliers_public_directory view
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Create secure function instead of public view
CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  is_verified boolean,
  rating numeric,
  specialties text[],
  materials_offered text[],
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated business users can access
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is authenticated and has business need
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_professional = true 
      OR user_type = 'company' 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.is_verified,
    s.rating,
    s.specialties,
    s.materials_offered,
    s.created_at
  FROM suppliers s
  WHERE s.is_verified = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;

-- Fix 3: Secure deliveries_safe view access
DROP VIEW IF EXISTS public.deliveries_safe CASCADE;

-- Create secure function to replace deliveries_safe view
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
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin gets full access
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY
    SELECT 
      d.id, d.quantity, d.weight_kg, d.pickup_date, d.delivery_date,
      d.estimated_delivery_time, d.actual_delivery_time, d.supplier_id,
      d.builder_id, d.project_id, d.created_at, d.updated_at,
      d.tracking_number, d.material_type, d.pickup_address, d.delivery_address,
      d.status, d.vehicle_details, d.notes, d.driver_name, d.driver_phone
    FROM deliveries d;
    RETURN;
  END IF;
  
  -- Builder sees their own deliveries
  IF current_user_role = 'builder' THEN
    RETURN QUERY
    SELECT 
      d.id, d.quantity, d.weight_kg, d.pickup_date, d.delivery_date,
      d.estimated_delivery_time, d.actual_delivery_time, d.supplier_id,
      d.builder_id, d.project_id, d.created_at, d.updated_at,
      d.tracking_number, d.material_type, d.pickup_address, d.delivery_address,
      d.status, d.vehicle_details, d.notes,
      CASE WHEN d.status IN ('in_progress', 'out_for_delivery') THEN d.driver_name ELSE NULL END,
      CASE WHEN d.status IN ('in_progress', 'out_for_delivery') THEN d.driver_phone ELSE NULL END
    FROM deliveries d
    WHERE d.builder_id = current_user_profile_id;
    RETURN;
  END IF;
  
  -- Supplier sees deliveries they're involved in (no driver contact)
  IF current_user_role = 'supplier' THEN
    RETURN QUERY
    SELECT 
      d.id, d.quantity, d.weight_kg, d.pickup_date, d.delivery_date,
      d.estimated_delivery_time, d.actual_delivery_time, d.supplier_id,
      d.builder_id, d.project_id, d.created_at, d.updated_at,
      d.tracking_number, d.material_type, d.pickup_address, d.delivery_address,
      d.status, d.vehicle_details, d.notes,
      NULL::text as driver_name,
      NULL::text as driver_phone
    FROM deliveries d
    JOIN suppliers s ON s.id = d.supplier_id
    WHERE s.user_id = auth.uid();
    RETURN;
  END IF;
  
  -- Default: no access
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_deliveries_safe() TO authenticated;

-- Fix 4: Complete RLS protection for driver_contact_access_log
ALTER TABLE public.driver_contact_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_contact_access_log FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view driver contact access logs" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_admin_read" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_system_insert" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_no_update" ON public.driver_contact_access_log;
DROP POLICY IF EXISTS "driver_contact_log_no_delete" ON public.driver_contact_access_log;

-- Admin read access only
CREATE POLICY "driver_contact_log_admin_read" 
ON public.driver_contact_access_log 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "driver_contact_log_system_insert" 
ON public.driver_contact_access_log 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- No updates or deletes (audit logs are immutable)
CREATE POLICY "driver_contact_log_no_modifications" 
ON public.driver_contact_access_log 
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);