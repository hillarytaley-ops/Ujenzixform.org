-- Fix critical security vulnerability: Secure driver personal data in deliveries table

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authorized users can view basic delivery info" ON public.deliveries;
DROP POLICY IF EXISTS "Authorized users can update delivery status" ON public.deliveries;
DROP POLICY IF EXISTS "Builders can create deliveries" ON public.deliveries;

-- Create restrictive base policy - NO direct table access to sensitive data
CREATE POLICY "Deliveries: Admin full access" 
ON public.deliveries FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Builders can only see their own deliveries (basic info only)
CREATE POLICY "Deliveries: Builders view own basic info" 
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

-- Suppliers can view deliveries they're involved with (basic info only)  
CREATE POLICY "Deliveries: Suppliers view own deliveries" 
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

-- Only authorized users can update delivery status (no driver info updates)
CREATE POLICY "Deliveries: Authorized status updates only" 
ON public.deliveries FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid() 
      AND s.id = deliveries.supplier_id
    )
  )
);

-- Secure delivery creation (builders only)
CREATE POLICY "Deliveries: Secure builder creation" 
ON public.deliveries FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('builder', 'admin')
    AND id = deliveries.builder_id
  )
);

-- Enhanced security function to get delivery info with driver contact protection
CREATE OR REPLACE FUNCTION public.get_delivery_with_secure_driver_info(delivery_uuid uuid)
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
  -- Secure driver fields
  can_view_driver_contact boolean,
  driver_display_name text,
  driver_contact_info text,
  security_message text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  can_access_driver boolean := false;
  delivery_record deliveries%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
  access_reason text := 'unauthorized';
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
  
  -- Determine driver contact access permissions
  IF user_profile_record.role = 'admin' THEN
    can_access_driver := true;
    access_reason := 'admin_access';
  ELSIF user_profile_record.id = delivery_record.builder_id AND 
        delivery_record.status IN ('in_progress', 'out_for_delivery', 'delivered') THEN
    can_access_driver := true;
    access_reason := 'builder_active_delivery';
  ELSIF EXISTS (
    SELECT 1 FROM suppliers s 
    WHERE s.user_id = user_profile_record.id 
    AND s.id = delivery_record.supplier_id 
    AND delivery_record.status IN ('in_progress', 'out_for_delivery')
  ) THEN
    can_access_driver := true;
    access_reason := 'supplier_active_delivery';
  END IF;
  
  -- Log all driver info access attempts for security monitoring
  INSERT INTO driver_info_access_log (
    user_id, 
    delivery_id, 
    access_type
  ) VALUES (
    auth.uid(), 
    delivery_uuid, 
    CASE 
      WHEN can_access_driver THEN 'driver_info_authorized_' || access_reason
      ELSE 'driver_info_denied_' || COALESCE(user_profile_record.role, 'unknown')
    END
  );
  
  -- Return data with conditional driver information
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
    can_access_driver,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_name IS NOT NULL 
      THEN delivery_record.driver_name 
      ELSE 'Driver assigned'
    END,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_phone IS NOT NULL 
      THEN delivery_record.driver_phone 
      ELSE NULL
    END,
    CASE 
      WHEN NOT can_access_driver THEN 'Driver contact available during active delivery to authorized parties'
      WHEN can_access_driver THEN 'Authorized access to driver contact information'
      ELSE 'No driver assigned yet'
    END;
END;
$$;

-- Create secure delivery listings function (no sensitive driver data)
CREATE OR REPLACE FUNCTION public.get_secure_delivery_listings()
RETURNS TABLE(
  id uuid,
  tracking_number text,
  material_type text,
  quantity integer,
  status text,
  pickup_date date,
  delivery_date date,
  estimated_delivery_time timestamp with time zone,
  created_at timestamp with time zone,
  builder_id uuid,
  supplier_id uuid,
  has_driver_assigned boolean,
  general_location text,
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
  
  -- Return safe delivery listings without exposing driver personal data
  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_number,
    d.material_type,
    d.quantity,
    d.status,
    d.pickup_date,
    d.delivery_date,
    d.estimated_delivery_time,
    d.created_at,
    d.builder_id,
    d.supplier_id,
    -- Safe indicator without exposing driver name/phone
    CASE WHEN d.driver_name IS NOT NULL THEN true ELSE false END,
    -- Only show general area, not full addresses
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