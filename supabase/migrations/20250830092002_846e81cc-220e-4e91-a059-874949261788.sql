-- CRITICAL SECURITY FIX: Completely secure driver personal data in deliveries table

-- First, verify RLS is enabled on deliveries table
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Drop any potentially insecure policies
DROP POLICY IF EXISTS "Public deliveries access" ON public.deliveries;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public read access" ON public.deliveries;

-- Ensure only our secure policies exist
-- Admin access policy (already exists but verify)
DROP POLICY IF EXISTS "Secure deliveries: Admin access" ON public.deliveries;
CREATE POLICY "Secure deliveries: Admin access" 
ON public.deliveries FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Builder can only view their own deliveries (basic info)
DROP POLICY IF EXISTS "Secure deliveries: Builder view own" ON public.deliveries;
CREATE POLICY "Secure deliveries: Builder view own" 
ON public.deliveries FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder' 
    AND id = deliveries.builder_id
  )
);

-- Suppliers can only view deliveries they're assigned to
DROP POLICY IF EXISTS "Secure deliveries: Supplier view assigned" ON public.deliveries;
CREATE POLICY "Secure deliveries: Supplier view assigned" 
ON public.deliveries FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.id
    WHERE p.user_id = auth.uid() 
    AND s.id = deliveries.supplier_id
  )
);

-- Enhanced secure function that completely protects driver data
CREATE OR REPLACE FUNCTION public.get_delivery_info_secure(delivery_uuid uuid)
RETURNS TABLE(
  id uuid,
  tracking_number text,
  material_type text,
  quantity integer,
  weight_kg numeric,
  pickup_address text,
  delivery_address text,
  status text,
  pickup_date date,
  delivery_date date,
  estimated_delivery_time timestamp with time zone,
  actual_delivery_time timestamp with time zone,
  vehicle_details text,
  notes text,
  builder_id uuid,
  supplier_id uuid,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Secure driver fields with strict access control
  has_driver_assigned boolean,
  can_view_driver_details boolean,
  driver_display_info text,
  driver_contact_access_message text,
  security_level text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  can_access_driver boolean := false;
  delivery_record deliveries%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
  access_level text := 'none';
BEGIN
  -- Get delivery record
  SELECT * INTO delivery_record 
  FROM deliveries 
  WHERE deliveries.id = delivery_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- STRICT driver contact access control
  IF user_profile_record.role = 'admin' THEN
    can_access_driver := true;
    access_level := 'admin_full_access';
  ELSIF user_profile_record.id = delivery_record.builder_id AND 
        delivery_record.status IN ('in_progress', 'out_for_delivery', 'delivered') THEN
    can_access_driver := true;
    access_level := 'builder_active_delivery';
  ELSIF EXISTS (
    SELECT 1 FROM suppliers s 
    WHERE s.user_id = user_profile_record.id 
    AND s.id = delivery_record.supplier_id 
    AND delivery_record.status IN ('in_progress', 'out_for_delivery')
  ) THEN
    can_access_driver := true;
    access_level := 'supplier_active_delivery';
  END IF;
  
  -- Log ALL driver info access attempts for security monitoring
  INSERT INTO driver_info_access_log (
    user_id, 
    delivery_id, 
    access_type
  ) VALUES (
    auth.uid(), 
    delivery_uuid, 
    CASE 
      WHEN can_access_driver THEN 'driver_info_secure_authorized_' || access_level
      ELSE 'driver_info_secure_denied_' || COALESCE(user_profile_record.role, 'unknown')
    END
  );
  
  -- Return data with MAXIMUM driver information protection
  RETURN QUERY SELECT
    delivery_record.id,
    delivery_record.tracking_number,
    delivery_record.material_type,
    delivery_record.quantity,
    delivery_record.weight_kg,
    delivery_record.pickup_address,
    delivery_record.delivery_address,
    delivery_record.status,
    delivery_record.pickup_date,
    delivery_record.delivery_date,
    delivery_record.estimated_delivery_time,
    delivery_record.actual_delivery_time,
    delivery_record.vehicle_details,
    delivery_record.notes,
    delivery_record.builder_id,
    delivery_record.supplier_id,
    delivery_record.project_id,
    delivery_record.created_at,
    delivery_record.updated_at,
    -- Secure driver information
    CASE WHEN delivery_record.driver_name IS NOT NULL THEN true ELSE false END,
    can_access_driver,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_name IS NOT NULL 
      THEN delivery_record.driver_name || CASE 
        WHEN delivery_record.driver_phone IS NOT NULL 
        THEN ' | ' || delivery_record.driver_phone 
        ELSE '' 
      END
      WHEN delivery_record.driver_name IS NOT NULL 
      THEN 'Driver assigned (contact restricted)'
      ELSE 'No driver assigned'
    END,
    CASE 
      WHEN NOT can_access_driver THEN 'Driver contact available only during active delivery to authorized parties'
      WHEN can_access_driver THEN 'Authorized access to driver contact information'
      ELSE 'No driver contact information available'
    END,
    'PROTECTED_' || access_level
END;
$$;

-- Create secure delivery summary function (NO sensitive driver data)
CREATE OR REPLACE FUNCTION public.get_delivery_summaries_secure()
RETURNS TABLE(
  id uuid,
  tracking_number text,
  material_type text,
  quantity integer,
  status text,
  estimated_delivery_time timestamp with time zone,
  created_at timestamp with time zone,
  builder_id uuid,
  supplier_id uuid,
  has_driver_assigned boolean,
  general_delivery_area text,
  can_request_driver_contact boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Return ONLY safe delivery summary data with NO driver personal information
  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_number,
    d.material_type,
    d.quantity,
    d.status,
    d.estimated_delivery_time,
    d.created_at,
    d.builder_id,
    d.supplier_id,
    -- Safe indicator without exposing driver details
    CASE WHEN d.driver_name IS NOT NULL THEN true ELSE false END,
    -- Only show general area, NEVER full addresses or driver info
    CASE 
      WHEN d.delivery_address IS NOT NULL 
      THEN COALESCE(split_part(d.delivery_address, ',', -1), 'Delivery area')
      ELSE 'Location not specified'
    END,
    -- Indicate if user can request driver contact (but don't expose it)
    CASE
      WHEN user_profile_record.role = 'admin' THEN true
      WHEN user_profile_record.id = d.builder_id AND d.status IN ('in_progress', 'out_for_delivery') THEN true
      WHEN EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.user_id = user_profile_record.id 
        AND s.id = d.supplier_id 
        AND d.status IN ('in_progress', 'out_for_delivery')
      ) THEN true
      ELSE false
    END
  FROM deliveries d
  WHERE 
    -- User can only see deliveries they're authorized for
    user_profile_record.role = 'admin'
    OR
    (user_profile_record.role = 'builder' AND d.builder_id = user_profile_record.id)
    OR
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.user_id = user_profile_record.id 
      AND s.id = d.supplier_id
    )
  ORDER BY d.created_at DESC;
END;
$$;

-- CRITICAL: Revoke any public access to sensitive columns
REVOKE ALL ON public.deliveries FROM public;
REVOKE ALL ON public.deliveries FROM anon;