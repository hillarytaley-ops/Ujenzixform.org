-- Enhanced Security Fix for Delivery Provider Personal Information Protection
-- This addresses the security finding: "Delivery Provider Personal Information Could Be Stolen"

-- 1. Create a secure function to mask sensitive provider data for non-authorized users
CREATE OR REPLACE FUNCTION public.get_delivery_provider_safe(provider_uuid uuid)
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  vehicle_types text[],
  service_areas text[],
  capacity_kg numeric,
  is_verified boolean,
  is_active boolean,
  rating numeric,
  total_deliveries integer,
  -- Sensitive fields that are conditionally returned
  can_view_contact boolean,
  phone_masked text,
  email_masked text,
  address_masked text,
  security_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_profile profiles%ROWTYPE;
  provider_record delivery_providers%ROWTYPE;
  can_access_sensitive boolean := false;
  access_reason text := 'unauthorized';
BEGIN
  -- Get current user profile
  SELECT * INTO current_user_profile 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get provider record
  SELECT * INTO provider_record 
  FROM delivery_providers 
  WHERE delivery_providers.id = provider_uuid;
  
  -- Check authorization for sensitive data access
  IF current_user_profile.role = 'admin' THEN
    can_access_sensitive := true;
    access_reason := 'admin_access';
  ELSIF current_user_profile.id = provider_record.user_id THEN
    can_access_sensitive := true;
    access_reason := 'provider_self_access';
  ELSIF EXISTS (
    -- Only allow access if there's an active business relationship
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = provider_uuid 
    AND dr.builder_id = current_user_profile.id
    AND dr.status IN ('accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '48 hours'
  ) THEN
    can_access_sensitive := true;
    access_reason := 'active_business_relationship';
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action, sensitive_fields_accessed
  ) VALUES (
    auth.uid(), provider_uuid, 'delivery_provider', 
    CASE WHEN can_access_sensitive THEN 'AUTHORIZED_VIEW' ELSE 'BLOCKED_SENSITIVE_ACCESS' END,
    CASE WHEN can_access_sensitive THEN ARRAY['contact_info'] ELSE ARRAY['BLOCKED'] END
  );
  
  -- Return masked data
  RETURN QUERY SELECT
    provider_record.id,
    provider_record.provider_name,
    provider_record.provider_type,
    provider_record.vehicle_types,
    provider_record.service_areas,
    provider_record.capacity_kg,
    provider_record.is_verified,
    provider_record.is_active,
    provider_record.rating,
    provider_record.total_deliveries,
    can_access_sensitive,
    -- Mask phone number
    CASE 
      WHEN can_access_sensitive THEN provider_record.phone
      WHEN provider_record.phone IS NOT NULL THEN 
        substring(provider_record.phone from 1 for 4) || '***' || substring(provider_record.phone from length(provider_record.phone) - 1)
      ELSE 'Contact via platform'
    END,
    -- Mask email
    CASE 
      WHEN can_access_sensitive THEN provider_record.email
      WHEN provider_record.email IS NOT NULL THEN 
        substring(provider_record.email from 1 for 3) || '***@' || split_part(provider_record.email, '@', 2)
      ELSE 'Contact via platform'
    END,
    -- Mask address
    CASE 
      WHEN can_access_sensitive THEN provider_record.address
      WHEN provider_record.address IS NOT NULL THEN 'Location available to business partners'
      ELSE 'Address protected'
    END,
    CASE
      WHEN can_access_sensitive THEN 'Authorized access: ' || access_reason
      ELSE 'Contact information protected - active delivery relationship required'
    END;
END;
$$;

-- 2. Create function to securely check provider availability without exposing exact locations
CREATE OR REPLACE FUNCTION public.check_provider_availability(
  target_lat numeric,
  target_lng numeric,
  radius_km numeric DEFAULT 25
)
RETURNS TABLE(
  provider_id uuid,
  provider_name text,
  distance_km numeric,
  is_available boolean,
  can_contact boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return basic availability info without exposing exact coordinates
  RETURN QUERY
  SELECT 
    dp.id,
    dp.provider_name,
    -- Calculate approximate distance without exposing exact coordinates
    CASE 
      WHEN dp.current_latitude IS NOT NULL AND dp.current_longitude IS NOT NULL THEN
        ROUND(
          6371 * acos(
            cos(radians(target_lat)) * cos(radians(dp.current_latitude)) *
            cos(radians(dp.current_longitude) - radians(target_lng)) +
            sin(radians(target_lat)) * sin(radians(dp.current_latitude))
          )
        )
      ELSE NULL
    END,
    dp.is_active AND dp.is_verified,
    -- Can only contact if there's a legitimate business need
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'builder')
    )
  FROM delivery_providers dp
  WHERE dp.is_active = true 
  AND dp.is_verified = true
  AND (
    dp.current_latitude IS NULL 
    OR (
      6371 * acos(
        cos(radians(target_lat)) * cos(radians(dp.current_latitude)) *
        cos(radians(dp.current_longitude) - radians(target_lng)) +
        sin(radians(target_lat)) * sin(radians(dp.current_latitude))
      ) <= radius_km
    )
  );
END;
$$;

-- 3. Enhance existing function to detect and log suspicious access patterns
CREATE OR REPLACE FUNCTION public.log_provider_access_and_detect_harvesting(
  provider_uuid uuid, 
  access_type text DEFAULT 'profile_view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_access_count integer;
  user_role text;
  is_authorized boolean := false;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Check if access is authorized
  SELECT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' 
      OR EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = provider_uuid AND dp.user_id = p.id
      )
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.provider_id = provider_uuid 
        AND dr.builder_id = p.id
        AND dr.status IN ('accepted', 'in_progress')
        AND dr.created_at > NOW() - INTERVAL '48 hours'
      )
    )
  ) INTO is_authorized;
  
  -- Log the access attempt
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action, sensitive_fields_accessed
  ) VALUES (
    auth.uid(), provider_uuid, 'delivery_provider', access_type,
    CASE WHEN is_authorized THEN ARRAY['authorized'] ELSE ARRAY['blocked'] END
  );
  
  -- Count recent access attempts by this user
  SELECT COUNT(*) INTO recent_access_count
  FROM delivery_access_log
  WHERE user_id = auth.uid()
  AND resource_type = 'delivery_provider'
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Detect potential data harvesting (more than 5 provider accesses in 10 minutes)
  IF recent_access_count > 5 AND user_role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      auth.uid(),
      'POTENTIAL_PROVIDER_DATA_HARVESTING',
      format('Suspicious pattern: %s provider accesses in 10 minutes by %s role', 
             recent_access_count, user_role)
    );
  END IF;
  
  RETURN is_authorized;
END;
$$;

-- 4. Create view that only exposes safe provider information
CREATE OR REPLACE VIEW public.delivery_providers_safe AS
SELECT 
  dp.id,
  dp.provider_name,
  dp.provider_type,
  dp.vehicle_types,
  dp.service_areas,
  dp.capacity_kg,
  dp.is_verified,
  dp.is_active,
  dp.rating,
  dp.total_deliveries,
  dp.created_at,
  dp.updated_at,
  -- Contact info only for authorized users
  CASE 
    WHEN log_provider_access_and_detect_harvesting(dp.id, 'safe_view') THEN 'Contact available'
    ELSE 'Contact via delivery request'
  END as contact_status
FROM delivery_providers dp
WHERE dp.is_active = true AND dp.is_verified = true;

-- 5. Grant appropriate permissions
GRANT SELECT ON public.delivery_providers_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_provider_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_provider_availability(numeric, numeric, numeric) TO authenticated;

-- 6. Log this security enhancement
INSERT INTO security_events (
  event_type, 
  details, 
  severity, 
  user_id
) VALUES (
  'DELIVERY_PROVIDER_DATA_PROTECTION_ENHANCED',
  jsonb_build_object(
    'description', 'Enhanced protection for delivery provider personal information including contact masking and access monitoring',
    'security_measures', ARRAY[
      'contact_data_masking_function',
      'safe_provider_view',
      'access_pattern_monitoring',
      'business_relationship_verification'
    ],
    'functions_created', ARRAY[
      'get_delivery_provider_safe',
      'check_provider_availability', 
      'log_provider_access_and_detect_harvesting'
    ],
    'timestamp', NOW()
  ),
  'high',
  auth.uid()
);