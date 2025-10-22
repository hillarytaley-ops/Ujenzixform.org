-- CRITICAL SECURITY FIX: Completely secure driver personal data in deliveries table

-- Ensure RLS is enabled on deliveries table
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Revoke any public access to the deliveries table
REVOKE ALL ON public.deliveries FROM public;
REVOKE ALL ON public.deliveries FROM anon;

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
    'PROTECTED_' || access_level;
END;
$$;