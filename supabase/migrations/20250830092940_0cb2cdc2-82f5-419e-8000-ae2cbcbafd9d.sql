-- Clean migration to fix driver data security issue
-- First, drop ALL existing policies on deliveries table
DROP POLICY IF EXISTS "Admin full access only" ON public.deliveries;
DROP POLICY IF EXISTS "Builder view own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Builder delivery creation" ON public.deliveries;
DROP POLICY IF EXISTS "Authorized status updates" ON public.deliveries;

-- Ensure no public access to deliveries table
REVOKE ALL ON public.deliveries FROM PUBLIC;
REVOKE ALL ON public.deliveries FROM authenticated;
REVOKE ALL ON public.deliveries FROM anon;

-- Grant minimal access for secure functions
GRANT SELECT, INSERT, UPDATE ON public.deliveries TO service_role;

-- Create single comprehensive policy for all operations
CREATE POLICY "Comprehensive secure delivery access"
ON public.deliveries FOR ALL
TO authenticated
USING (
  -- Admin has full access
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Builders can see their own deliveries
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'builder'
      AND p.id = deliveries.builder_id
    )
  )
  OR
  -- Suppliers can see assigned deliveries
  (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid()
      AND s.id = deliveries.supplier_id
    )
  )
)
WITH CHECK (
  -- Admin can modify anything
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Builders can create their own deliveries
  (
    TG_OP = 'INSERT' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'builder'
      AND id = deliveries.builder_id
    )
  )
  OR
  -- Suppliers can update status of assigned deliveries
  (
    TG_OP = 'UPDATE' AND
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid()
      AND s.id = deliveries.supplier_id
    )
  )
);

-- Create the ultimate secure function for driver contact access
CREATE OR REPLACE FUNCTION public.get_secure_driver_contact(delivery_uuid uuid)
RETURNS TABLE(
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
  -- Access delivery data using elevated privileges
  SELECT * INTO delivery_record 
  FROM deliveries 
  WHERE deliveries.id = delivery_uuid;
  
  IF NOT FOUND THEN
    -- Log unauthorized access attempt
    INSERT INTO driver_info_access_log (
      user_id, delivery_id, access_type
    ) VALUES (
      auth.uid(), delivery_uuid, 'SECURITY_VIOLATION_invalid_delivery'
    );
    
    RETURN QUERY SELECT
      false,
      'Invalid delivery'::text,
      NULL::text,
      'SECURITY VIOLATION: Access to non-existent delivery logged'::text;
    RETURN;
  END IF;
  
  -- Get user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Strict driver contact access rules
  IF user_profile_record.role = 'admin' THEN
    can_access_driver := true;
    access_reason := 'admin_override';
  ELSIF user_profile_record.id = delivery_record.builder_id AND 
        delivery_record.status IN ('in_progress', 'out_for_delivery') THEN
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
  
  -- Log all access attempts
  INSERT INTO driver_info_access_log (
    user_id, 
    delivery_id, 
    access_type
  ) VALUES (
    auth.uid(), 
    delivery_uuid, 
    CASE 
      WHEN can_access_driver THEN 'AUTHORIZED_' || access_reason
      ELSE 'DENIED_unauthorized_access'
    END
  );
  
  -- Return secure driver information
  RETURN QUERY SELECT
    can_access_driver,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_name IS NOT NULL 
      THEN delivery_record.driver_name 
      WHEN delivery_record.driver_name IS NOT NULL
      THEN 'Driver assigned'
      ELSE 'No driver assigned'
    END,
    CASE 
      WHEN can_access_driver AND delivery_record.driver_phone IS NOT NULL 
      THEN delivery_record.driver_phone 
      ELSE NULL
    END,
    CASE 
      WHEN NOT can_access_driver THEN 'Driver contact protected - only available during active delivery'
      WHEN can_access_driver THEN 'Authorized access granted: ' || access_reason
      ELSE 'No driver contact available'
    END;
END;
$$;