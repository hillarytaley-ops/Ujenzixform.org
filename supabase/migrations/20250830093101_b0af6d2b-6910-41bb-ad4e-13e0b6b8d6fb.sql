-- Final migration to completely secure driver personal data
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin full access only" ON public.deliveries;
DROP POLICY IF EXISTS "Builder view own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Builder delivery creation" ON public.deliveries;
DROP POLICY IF EXISTS "Authorized status updates" ON public.deliveries;
DROP POLICY IF EXISTS "Comprehensive secure delivery access" ON public.deliveries;

-- Revoke direct table access completely
REVOKE ALL ON public.deliveries FROM PUBLIC;
REVOKE ALL ON public.deliveries FROM authenticated;
REVOKE ALL ON public.deliveries FROM anon;

-- Grant only to service role for security functions
GRANT SELECT, INSERT, UPDATE ON public.deliveries TO service_role;

-- Create separate secure policies for each operation
CREATE POLICY "Admin full access"
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

CREATE POLICY "Builder select own"
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

CREATE POLICY "Supplier select assigned"
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

CREATE POLICY "Builder insert own"
ON public.deliveries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'builder'
    AND id = deliveries.builder_id
  )
);

CREATE POLICY "Supplier update assigned"
ON public.deliveries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND s.id = deliveries.supplier_id
  )
);

-- Create secure driver contact function
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
  -- Use elevated privileges to access delivery data
  SELECT * INTO delivery_record 
  FROM deliveries 
  WHERE deliveries.id = delivery_uuid;
  
  IF NOT FOUND THEN
    INSERT INTO driver_info_access_log (
      user_id, delivery_id, access_type
    ) VALUES (
      auth.uid(), delivery_uuid, 'SECURITY_VIOLATION_invalid_delivery'
    );
    
    RETURN QUERY SELECT
      false,
      'Invalid delivery'::text,
      NULL::text,
      'SECURITY VIOLATION: Unauthorized access logged'::text;
    RETURN;
  END IF;
  
  -- Get user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Ultra-strict access control for driver contact
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
  
  -- Log ALL access attempts for security monitoring
  INSERT INTO driver_info_access_log (
    user_id, 
    delivery_id, 
    access_type
  ) VALUES (
    auth.uid(), 
    delivery_uuid, 
    CASE 
      WHEN can_access_driver THEN 'AUTHORIZED_' || access_reason
      ELSE 'DENIED_unauthorized_access_attempt'
    END
  );
  
  -- Return protected driver information
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
      WHEN NOT can_access_driver THEN 'PROTECTED: Driver contact only available during active delivery to authorized parties'
      WHEN can_access_driver THEN 'Authorized access: ' || access_reason
      ELSE 'No driver contact available'
    END;
END;
$$;