-- Drop existing deliveries policies and create strict authorized-only access
DROP POLICY IF EXISTS "deliveries_admin_only_2024" ON deliveries;

-- Create new strict policy for deliveries table that allows access only to authorized participants
CREATE POLICY "deliveries_authorized_participants_only_2024" 
ON deliveries FOR ALL
USING (
  -- Admin has full access
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )) OR
  -- Builder can access their own deliveries
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder' AND id = deliveries.builder_id
  )) OR
  -- Supplier can access deliveries assigned to them
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.user_id
    WHERE p.user_id = auth.uid() AND p.role = 'supplier' AND s.id = deliveries.supplier_id
  )) OR
  -- Delivery provider can access deliveries assigned to them (only during active delivery phases)
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN delivery_providers dp ON dp.user_id = p.user_id
    JOIN delivery_requests dr ON dr.provider_id = dp.id
    WHERE p.user_id = auth.uid() AND p.role = 'delivery_provider' 
    AND dr.id IN (
      SELECT dr2.id FROM delivery_requests dr2 
      WHERE dr2.builder_id = deliveries.builder_id 
      AND dr2.status IN ('accepted', 'in_progress', 'completed')
      AND dr2.material_type = deliveries.material_type
      AND dr2.created_at > NOW() - INTERVAL '30 days'
    )
  ))
)
WITH CHECK (
  -- Only admin can create/update deliveries
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create additional security function for sensitive driver data access
CREATE OR REPLACE FUNCTION public.get_current_user_role_secure()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Insert security audit log
INSERT INTO security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'DELIVERIES_RLS_POLICY_HARDENED',
  'high',
  jsonb_build_object(
    'action', 'strict_authorized_participants_only_policy_implemented',
    'protected_fields', ARRAY['driver_name', 'driver_phone'],
    'authorized_roles', ARRAY['admin', 'authorized_builder', 'assigned_supplier', 'active_delivery_provider'],
    'timestamp', NOW()
  )
);

-- Create helper function to validate delivery access authorization
CREATE OR REPLACE FUNCTION public.validate_delivery_access_authorization(delivery_uuid uuid)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
  is_authorized BOOLEAN := false;
BEGIN
  -- Get current user info
  SELECT role, id INTO current_user_role, current_user_profile_id
  FROM profiles WHERE user_id = auth.uid();
  
  -- Admin always authorized
  IF current_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check specific authorization based on role
  IF current_user_role = 'builder' THEN
    SELECT EXISTS(
      SELECT 1 FROM deliveries 
      WHERE id = delivery_uuid AND builder_id = current_user_profile_id
    ) INTO is_authorized;
  ELSIF current_user_role = 'supplier' THEN
    SELECT EXISTS(
      SELECT 1 FROM deliveries d
      JOIN suppliers s ON s.id = d.supplier_id
      WHERE d.id = delivery_uuid AND s.user_id = auth.uid()
    ) INTO is_authorized;
  ELSIF current_user_role = 'delivery_provider' THEN
    SELECT EXISTS(
      SELECT 1 FROM deliveries d
      JOIN delivery_requests dr ON dr.builder_id = d.builder_id
      JOIN delivery_providers dp ON dp.id = dr.provider_id
      WHERE d.id = delivery_uuid 
      AND dp.user_id = auth.uid()
      AND dr.status IN ('accepted', 'in_progress', 'completed')
      AND dr.created_at > NOW() - INTERVAL '30 days'
    ) INTO is_authorized;
  END IF;
  
  RETURN is_authorized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;