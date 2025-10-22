-- Drop all existing policies on deliveries table first
DROP POLICY IF EXISTS "Ultra secure: Admin only full access" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Admin only access" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Builder view delivery status only" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Supplier view assigned status only" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Builder creation only" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Status updates only by authorized roles" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Builder view own deliveries only" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Supplier view assigned deliveries only" ON public.deliveries;
DROP POLICY IF EXISTS "Ultra secure: Status updates by authorized roles only" ON public.deliveries;

-- Revoke all direct access to deliveries table to prevent data theft
REVOKE ALL ON public.deliveries FROM PUBLIC;
REVOKE ALL ON public.deliveries FROM authenticated;
REVOKE ALL ON public.deliveries FROM anon;

-- Grant only service role access for security functions
GRANT SELECT ON public.deliveries TO service_role;

-- Create ultra-secure policies that completely prevent unauthorized driver data access
CREATE POLICY "Admin full access only"
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

-- Builders can only see their own deliveries without driver personal data
CREATE POLICY "Builder view own deliveries"
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

-- Suppliers can only see assigned deliveries without driver personal data
CREATE POLICY "Supplier view assigned deliveries" 
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
CREATE POLICY "Builder delivery creation"
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
CREATE POLICY "Authorized status updates"
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

-- Replace the existing secure function with ultra-secure version
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
  -- Use service role privileges to access delivery data
  SELECT * INTO delivery_record 
  FROM deliveries 
  WHERE deliveries.id = delivery_uuid;
  
  IF NOT FOUND THEN
    -- Log security violation for non-existent delivery access
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
  
  -- ULTRA STRICT access - driver contact only during active deliveries
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
  
  -- Log all access attempts for security monitoring
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
  
  -- Return data with maximum driver information protection
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
    -- Driver name protection
    CASE 
      WHEN can_access_driver AND delivery_record.driver_name IS NOT NULL 
      THEN delivery_record.driver_name 
      WHEN delivery_record.driver_name IS NOT NULL
      THEN 'Driver assigned - contact restricted'
      ELSE 'No driver assigned'
    END,
    -- Driver phone protection - only for authorized active deliveries
    CASE 
      WHEN can_access_driver AND delivery_record.driver_phone IS NOT NULL 
      THEN delivery_record.driver_phone 
      ELSE NULL
    END,
    -- Security status message
    CASE 
      WHEN security_violation THEN 'SECURITY VIOLATION: Unauthorized access attempt logged'
      WHEN NOT can_access_driver THEN 'Driver contact protected - only available during active delivery to authorized parties'
      WHEN can_access_driver THEN 'Authorized access: ' || access_reason
      ELSE 'No driver assigned'
    END;
END;
$$;