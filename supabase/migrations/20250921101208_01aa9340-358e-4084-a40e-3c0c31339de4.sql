-- CRITICAL SECURITY FIX: Make deliveries admin-only and protect phone numbers

-- 1. DROP all existing deliveries policies and make admin-only
DROP POLICY IF EXISTS "deliveries_2024_admin_secure_access" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_2024_builder_protected_access" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_2024_secure_updates_only" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_2024_supplier_protected_access" ON public.deliveries;

-- Create admin-only policy for deliveries table
CREATE POLICY "deliveries_admin_only_2024" ON public.deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Create separate driver_contact_data table for ultra-secure phone storage
CREATE TABLE IF NOT EXISTS public.driver_contact_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_name text,
  driver_phone text,
  driver_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on driver_contact_data
ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;

-- Admin-only access to driver contact data
CREATE POLICY "driver_contact_admin_only" ON public.driver_contact_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Create secure function for builders to get their deliveries (no driver contact)
CREATE OR REPLACE FUNCTION public.get_builder_deliveries_safe(builder_uuid uuid)
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
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  vehicle_details text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  has_driver_assigned boolean,
  driver_display_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
BEGIN
  -- Get current user's role and profile ID
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Only allow builders to access their own deliveries or admins to access any
  IF current_user_role = 'admin' OR (current_user_role = 'builder' AND current_user_profile_id = builder_uuid) THEN
    RETURN QUERY
    SELECT 
      d.id,
      d.tracking_number,
      d.material_type,
      d.quantity,
      d.weight_kg,
      d.pickup_address,
      d.delivery_address,
      d.status,
      d.pickup_date,
      d.delivery_date,
      d.estimated_delivery_time,
      d.actual_delivery_time,
      d.vehicle_details,
      d.notes,
      d.created_at,
      d.updated_at,
      CASE WHEN d.driver_name IS NOT NULL THEN true ELSE false END as has_driver_assigned,
      CASE 
        WHEN d.driver_name IS NOT NULL 
        THEN 'Driver assigned - contact via secure request'
        ELSE 'No driver assigned'
      END as driver_display_message
    FROM deliveries d
    WHERE d.builder_id = builder_uuid;
  END IF;
END;
$$;

-- 4. Create secure function for suppliers to get their deliveries (no driver contact)
CREATE OR REPLACE FUNCTION public.get_supplier_deliveries_safe(supplier_uuid uuid)
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
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  vehicle_details text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  can_update_status boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_supplier_id uuid;
BEGIN
  -- Get current user's role and supplier ID
  SELECT p.role INTO current_user_role FROM profiles p WHERE p.user_id = auth.uid();
  SELECT s.id INTO current_supplier_id FROM suppliers s WHERE s.user_id = auth.uid();
  
  -- Only allow suppliers to access their assigned deliveries or admins to access any
  IF current_user_role = 'admin' OR (current_user_role = 'supplier' AND current_supplier_id = supplier_uuid) THEN
    RETURN QUERY
    SELECT 
      d.id,
      d.tracking_number,
      d.material_type,
      d.quantity,
      d.weight_kg,
      d.pickup_address,
      d.delivery_address,
      d.status,
      d.pickup_date,
      d.delivery_date,
      d.estimated_delivery_time,
      d.actual_delivery_time,
      d.vehicle_details,
      d.notes,
      d.created_at,
      d.updated_at,
      (current_user_role = 'supplier' AND d.status IN ('picked_up', 'in_transit', 'out_for_delivery')) as can_update_status
    FROM deliveries d
    WHERE d.supplier_id = supplier_uuid;
  END IF;
END;
$$;

-- 5. Create ultra-secure function for driver contact access (admin + authorized users only)
CREATE OR REPLACE FUNCTION public.get_driver_contact_secure(delivery_uuid uuid, access_justification text)
RETURNS TABLE(
  delivery_id uuid,
  driver_name text,
  driver_phone text,
  access_granted boolean,
  security_message text,
  access_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id uuid;
  delivery_record deliveries%ROWTYPE;
  user_profile_id uuid;
BEGIN
  -- Get current user info
  SELECT auth.uid() INTO current_user_id;
  SELECT p.role, p.id INTO current_user_role, user_profile_id 
  FROM profiles p WHERE p.user_id = current_user_id;
  
  -- Get delivery record
  SELECT * INTO delivery_record FROM deliveries WHERE id = delivery_uuid;
  
  -- Log access attempt
  INSERT INTO driver_contact_access_log (
    user_id, delivery_id, access_type, delivery_status, user_role, 
    authorized, business_justification
  ) VALUES (
    current_user_id, delivery_uuid, 'contact_request', 
    delivery_record.status, current_user_role,
    (current_user_role = 'admin' OR 
     (current_user_role = 'builder' AND user_profile_id = delivery_record.builder_id AND delivery_record.status IN ('in_progress', 'out_for_delivery', 'delivered')) OR
     (current_user_role = 'supplier' AND delivery_record.supplier_id IN (SELECT id FROM suppliers WHERE user_id = current_user_id) AND delivery_record.status IN ('picked_up', 'in_transit'))),
    access_justification
  );
  
  -- Check access authorization
  IF current_user_role = 'admin' THEN
    -- Admin gets full access
    RETURN QUERY
    SELECT 
      delivery_uuid,
      COALESCE(dcd.driver_name, delivery_record.driver_name),
      COALESCE(dcd.driver_phone, delivery_record.driver_phone),
      true,
      'Admin access granted',
      'admin_full_access'
    FROM deliveries d
    LEFT JOIN driver_contact_data dcd ON dcd.delivery_id = d.id
    WHERE d.id = delivery_uuid;
    
  ELSIF current_user_role = 'builder' AND user_profile_id = delivery_record.builder_id 
        AND delivery_record.status IN ('in_progress', 'out_for_delivery', 'delivered') THEN
    -- Builder gets limited access during delivery phase
    RETURN QUERY
    SELECT 
      delivery_uuid,
      COALESCE(dcd.driver_name, delivery_record.driver_name, 'Driver assigned'),
      COALESCE(dcd.driver_phone, delivery_record.driver_phone, 'Contact via platform'),
      (dcd.driver_phone IS NOT NULL OR delivery_record.driver_phone IS NOT NULL),
      'Builder access during active delivery',
      'builder_active_delivery'
    FROM deliveries d
    LEFT JOIN driver_contact_data dcd ON dcd.delivery_id = d.id
    WHERE d.id = delivery_uuid;
    
  ELSIF current_user_role = 'supplier' AND delivery_record.supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = current_user_id
  ) AND delivery_record.status IN ('picked_up', 'in_transit') THEN
    -- Supplier gets limited access during pickup/transit
    RETURN QUERY
    SELECT 
      delivery_uuid,
      'Driver assigned',
      'Contact available for coordination',
      true,
      'Supplier access during pickup/transit phase',
      'supplier_coordination_access'
    FROM deliveries d
    WHERE d.id = delivery_uuid;
    
  ELSE
    -- Access denied
    RETURN QUERY
    SELECT 
      delivery_uuid,
      'Driver information protected'::text,
      'Unauthorized access'::text,
      false,
      'Driver contact access restricted to authorized parties during active delivery phases',
      'access_denied'
    FROM deliveries d
    WHERE d.id = delivery_uuid;
  END IF;
END;
$$;

-- 6. Update existing phone number protection across all tables
-- Delivery providers phone protection
DROP POLICY IF EXISTS "delivery_providers_secure_admin_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_secure_business_relationship" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_secure_owner_access" ON public.delivery_providers;

CREATE POLICY "delivery_providers_admin_only_full_access" ON public.delivery_providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "delivery_providers_owner_limited_access" ON public.delivery_providers
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'delivery_provider')
  );

-- 7. Create function to get delivery tracking without sensitive data
CREATE OR REPLACE FUNCTION public.get_delivery_tracking_public(tracking_num text)
RETURNS TABLE(
  tracking_number text,
  material_type text,
  status text,
  estimated_delivery timestamptz,
  pickup_address text,
  delivery_address text,
  last_update timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.tracking_number,
    d.material_type,
    d.status,
    d.estimated_delivery_time,
    -- Mask addresses for privacy
    substring(d.pickup_address, 1, 20) || '...' as pickup_address,
    substring(d.delivery_address, 1, 20) || '...' as delivery_address,
    d.updated_at
  FROM deliveries d
  WHERE d.tracking_number = tracking_num;
END;
$$;

-- Log security fix completion
INSERT INTO security_events (
  event_type, severity, details
) VALUES (
  'CRITICAL_DELIVERIES_SECURITY_FIX_COMPLETED',
  'high',
  '{"action": "deliveries_admin_only_policy", "phone_protection": "enabled", "driver_contact_isolation": "completed", "secure_functions_created": ["get_builder_deliveries_safe", "get_supplier_deliveries_safe", "get_driver_contact_secure", "get_delivery_tracking_public"]}'
);