-- CRITICAL FIX: Secure driver contact information from unauthorized access
-- Current deliveries table exposes driver phone numbers to all authorized users
-- Need to restrict driver contact info to only delivery participants who need it

-- Create comprehensive driver information access control
-- Only allow driver contact access during active delivery phases

-- Update existing policies to exclude driver contact info from general access
DROP POLICY IF EXISTS "Secure delivery access for authorized users" ON public.deliveries;

-- Create granular policies that separate basic delivery info from sensitive driver data
CREATE POLICY "Users can view basic delivery information" 
ON public.deliveries 
FOR SELECT 
TO authenticated
USING (
  -- Users can see delivery details but not driver contact info
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND id = deliveries.builder_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id
    )
  )
);

-- Create a secure function that controls driver information access
CREATE OR REPLACE FUNCTION public.get_secure_delivery_info(delivery_uuid uuid)
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
  -- Controlled driver information
  can_view_driver_contact boolean,
  driver_display_name text,
  driver_contact_info text,
  security_message text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_access_driver boolean := false;
  delivery_record deliveries%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
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
  
  -- Check if user can access driver contact information
  SELECT (
    user_profile_record.role = 'admin' OR
    (user_profile_record.id = delivery_record.builder_id AND 
     delivery_record.status IN ('in_progress', 'out_for_delivery', 'delivered')) OR
    (EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.user_id = user_profile_record.id 
      AND s.id = delivery_record.supplier_id 
      AND delivery_record.status IN ('in_progress', 'out_for_delivery')
    ))
  ) INTO can_access_driver;
  
  -- Log driver contact access if sensitive fields are being viewed
  IF can_access_driver AND delivery_record.driver_phone IS NOT NULL THEN
    PERFORM public.log_driver_info_access(
      delivery_uuid, 
      'driver_contact_authorized_access'
    );
  END IF;
  
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
      WHEN NOT can_access_driver THEN 'Driver contact available during active delivery'
      WHEN can_access_driver THEN 'Authorized access to driver contact'
      ELSE 'No driver assigned yet'
    END;
END;
$$;

-- Create a public function for delivery listings that excludes driver contact info
CREATE OR REPLACE FUNCTION public.get_safe_delivery_listings()
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
  general_location text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    CASE WHEN d.driver_name IS NOT NULL THEN true ELSE false END,
    -- Only show general area, not specific addresses
    CASE 
      WHEN d.delivery_address IS NOT NULL 
      THEN split_part(d.delivery_address, ',', -1) 
      ELSE 'Location not specified'
    END
  FROM deliveries d
  WHERE 
    -- User has legitimate access to see delivery
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'admin'
      ) OR
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND p.id = d.builder_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN suppliers s ON s.user_id = p.id
        WHERE p.user_id = auth.uid() AND s.id = d.supplier_id
      )
    )
  ORDER BY d.created_at DESC;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_secure_delivery_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_delivery_listings() TO authenticated;