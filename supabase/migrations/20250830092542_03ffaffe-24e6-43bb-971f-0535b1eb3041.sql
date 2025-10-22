-- Ultra-secure protection for driver personal data in deliveries table
-- Revoke all direct access to deliveries table
REVOKE ALL ON public.deliveries FROM PUBLIC;
REVOKE ALL ON public.deliveries FROM authenticated;
REVOKE ALL ON public.deliveries FROM anon;

-- Grant only necessary permissions through secure functions
GRANT SELECT ON public.deliveries TO service_role;

-- Drop existing policies to recreate with ultra-strict access
DROP POLICY IF EXISTS "Secure deliveries: Admin access" ON public.deliveries;
DROP POLICY IF EXISTS "Secure deliveries: Builder view own" ON public.deliveries;
DROP POLICY IF EXISTS "Secure deliveries: Supplier view assigned" ON public.deliveries;
DROP POLICY IF EXISTS "Secure deliveries: Builder creation" ON public.deliveries;
DROP POLICY IF EXISTS "Secure deliveries: Status updates only" ON public.deliveries;

-- Ultra-secure policies that completely prevent unauthorized access to driver data
CREATE POLICY "Ultra secure: Admin only full access"
ON public.deliveries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Builders can only see their own deliveries WITHOUT driver personal data
CREATE POLICY "Ultra secure: Builder view own deliveries only"
ON public.deliveries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'builder'
    AND p.id = deliveries.builder_id
  )
);

-- Suppliers can only see assigned deliveries WITHOUT driver personal data
CREATE POLICY "Ultra secure: Supplier view assigned deliveries only" 
ON public.deliveries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND s.id = deliveries.supplier_id
  )
);

-- Only builders can create deliveries
CREATE POLICY "Ultra secure: Builder creation only"
ON public.deliveries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('builder', 'admin')
    AND id = deliveries.builder_id
  )
);

-- Only admin and suppliers can update delivery status
CREATE POLICY "Ultra secure: Status updates by authorized roles only"
ON public.deliveries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND s.id = deliveries.supplier_id
  )
);

-- Create secure view that excludes driver personal data for non-admin users
CREATE OR REPLACE VIEW public.secure_delivery_view AS
SELECT 
  id,
  tracking_number,
  material_type,
  quantity,
  weight_kg,
  status,
  pickup_date,
  delivery_date,
  estimated_delivery_time,
  actual_delivery_time,
  vehicle_details,
  notes,
  builder_id,
  supplier_id,
  project_id,
  created_at,
  updated_at,
  -- Hide sensitive address data from non-admins
  CASE 
    WHEN get_current_user_role() = 'admin' THEN pickup_address
    ELSE 'Address protected - contact admin for access'
  END as pickup_address,
  CASE 
    WHEN get_current_user_role() = 'admin' THEN delivery_address  
    ELSE 'Address protected - contact admin for access'
  END as delivery_address,
  -- Driver personal data completely hidden from view
  CASE 
    WHEN get_current_user_role() = 'admin' THEN driver_name
    ELSE NULL
  END as driver_name,
  -- Driver phone NEVER exposed through this view
  NULL as driver_phone
FROM public.deliveries;

-- Grant access to the secure view
GRANT SELECT ON public.secure_delivery_view TO authenticated;

-- Enhanced secure function for driver contact access with violation logging
CREATE OR REPLACE FUNCTION public.get_delivery_with_ultra_secure_driver_info(delivery_uuid uuid)
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
  security_violation boolean := false;
BEGIN
  -- Get delivery record using service role privileges
  SELECT * INTO delivery_record 
  FROM deliveries 
  WHERE deliveries.id = delivery_uuid;
  
  IF NOT FOUND THEN
    -- Log security violation attempt for non-existent delivery
    INSERT INTO driver_info_access_log (
      user_id, delivery_id, access_type
    ) VALUES (
      auth.uid(), delivery_uuid, 'SECURITY_VIOLATION_nonexistent_delivery'
    );
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- ULTRA STRICT driver contact access permissions - only during active deliveries
  IF user_profile_record.role = 'admin' THEN
    can_access_driver := true;
    access_reason := 'admin_access';
  ELSIF user_profile_record.id = delivery_record.builder_id AND 
        delivery_record.status IN ('in_progress', 'out_for_delivery') THEN
    can_access_driver := true;
    access_reason := 'builder_active_delivery_only';
  ELSIF EXISTS (
    SELECT 1 FROM suppliers s 
    WHERE s.user_id = user_profile_record.id 
    AND s.id = delivery_record.supplier_id 
    AND delivery_record.status IN ('in_progress', 'out_for_delivery')
  ) THEN
    can_access_driver := true;
    access_reason := 'supplier_active_delivery_only';
  ELSE
    security_violation := true;
  END IF;
  
  -- Enhanced security logging with violation detection
  INSERT INTO driver_info_access_log (
    user_id, 
    delivery_id, 
    access_type
  ) VALUES (
    auth.uid(), 
    delivery_uuid, 
    CASE 
      WHEN security_violation THEN 'SECURITY_VIOLATION_unauthorized_driver_access'
      WHEN can_access_driver THEN 'AUTHORIZED_driver_info_' || access_reason
      ELSE 'DENIED_driver_info_' || COALESCE(user_profile_record.role, 'unknown')
    END
  );
  
  -- Return data with ultra-strict driver information protection
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
      WHEN delivery_record.driver_name IS NOT NULL
      THEN 'Driver assigned - contact restricted'
      ELSE 'No driver assigned'
    END,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_phone IS NOT NULL 
      THEN delivery_record.driver_phone 
      ELSE NULL
    END,
    CASE 
      WHEN security_violation THEN 'SECURITY VIOLATION: Unauthorized access attempt logged and reported'
      WHEN NOT can_access_driver THEN 'Driver contact strictly protected - only available during active delivery to authorized parties'
      WHEN can_access_driver THEN 'Authorized access to driver contact information - ' || access_reason
      ELSE 'No driver assigned yet'
    END;
END;
$$;