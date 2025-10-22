-- CRITICAL GPS LOCATION SECURITY FIX
-- Fix delivery_tracking table to make GPS coordinates admin-only access
-- Fix delivery_providers location data with anonymization and time restrictions

-- 1. Drop existing permissive policies on delivery_tracking that expose GPS data
DROP POLICY IF EXISTS "delivery_tracking_authorized_only" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_provider_insert_only" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_provider_update_only" ON delivery_tracking;

-- 2. Create ultra-strict admin-only GPS access policies for delivery_tracking
CREATE POLICY "delivery_tracking_gps_admin_only_2024" 
ON delivery_tracking 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 3. Allow providers to insert/update tracking but without exposing GPS to others
CREATE POLICY "delivery_tracking_provider_location_insert_2024" 
ON delivery_tracking 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_tracking.provider_id 
        AND dp.user_id = p.id
      )
    )
  )
);

CREATE POLICY "delivery_tracking_provider_location_update_2024" 
ON delivery_tracking 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_tracking.provider_id 
        AND dp.user_id = p.id
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_tracking.provider_id 
        AND dp.user_id = p.id
      )
    )
  )
);

-- 4. Create secure function for anonymized delivery status (no GPS coordinates)
CREATE OR REPLACE FUNCTION public.get_delivery_status_safe(delivery_request_uuid uuid)
RETURNS TABLE(
  delivery_request_id uuid,
  status text,
  estimated_arrival timestamp with time zone,
  notes text,
  last_update timestamp with time zone,
  -- NO GPS coordinates exposed
  provider_active boolean,
  delivery_in_progress boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Log access attempt for security monitoring
  INSERT INTO location_access_security_audit (
    user_id, accessed_table, location_data_type,
    access_justification, risk_level
  ) VALUES (
    auth.uid(), 'delivery_tracking', 'status_only_no_gps',
    'Safe delivery status access - no GPS coordinates exposed',
    'low'
  );
  
  -- Only return non-location tracking data
  RETURN QUERY
  SELECT 
    dt.delivery_request_id,
    dt.status,
    dt.estimated_arrival,
    dt.notes,
    dt.updated_at as last_update,
    -- Status indicators without revealing GPS
    (dt.provider_id IS NOT NULL) as provider_active,
    (dt.status IN ('in_transit', 'approaching', 'arrived')) as delivery_in_progress
  FROM delivery_tracking dt
  WHERE dt.delivery_request_id = delivery_request_uuid
  AND (
    current_user_role = 'admin' OR
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_request_uuid
      AND dr.builder_id = current_user_profile_id
    )
  )
  ORDER BY dt.updated_at DESC
  LIMIT 1;
END;
$$;

-- 5. Create time-based anonymized location function for delivery providers
CREATE OR REPLACE FUNCTION public.get_provider_location_anonymized(provider_uuid uuid)
RETURNS TABLE(
  provider_id uuid,
  location_region text,
  last_seen_approximate text,
  is_recently_active boolean,
  -- NO exact GPS coordinates
  availability_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
  location_age interval;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Log access attempt for stalking prevention
  INSERT INTO location_access_security_audit (
    user_id, accessed_table, location_data_type,
    access_justification, risk_level
  ) VALUES (
    auth.uid(), 'delivery_providers', 'anonymized_region_only',
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin anonymized location access'
      ELSE 'BLOCKED: Potential stalking attempt - location anonymized'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      ELSE 'high'
    END
  );
  
  -- Only admin gets any location data (heavily anonymized)
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      dp.id,
      -- Anonymize location to general region only
      CASE 
        WHEN dp.current_latitude IS NOT NULL AND dp.current_longitude IS NOT NULL
        THEN 'General Service Area'
        ELSE 'Location Unknown'
      END as location_region,
      -- Time-based anonymization
      CASE 
        WHEN dp.last_location_update IS NOT NULL AND dp.last_location_update > NOW() - INTERVAL '24 hours'
        THEN 'Active Today'
        WHEN dp.last_location_update IS NOT NULL AND dp.last_location_update > NOW() - INTERVAL '7 days'
        THEN 'Active This Week'
        ELSE 'Not Recently Active'
      END as last_seen_approximate,
      -- Activity indicator without exact timing
      (dp.last_location_update IS NOT NULL AND dp.last_location_update > NOW() - INTERVAL '1 hour') as is_recently_active,
      CASE 
        WHEN dp.is_active = true THEN 'Available'
        ELSE 'Unavailable'
      END as availability_status
    FROM delivery_providers dp
    WHERE dp.id = provider_uuid;
  ELSE
    -- Non-admin gets minimal info with no location data
    RETURN QUERY
    SELECT 
      provider_uuid,
      'Location Protected'::text as location_region,
      'Access Restricted'::text as last_seen_approximate,
      false as is_recently_active,
      'Contact via Platform'::text as availability_status;
  END IF;
END;
$$;

-- 6. Create location access security audit table
CREATE TABLE IF NOT EXISTS location_access_security_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  accessed_table text NOT NULL,
  location_data_type text NOT NULL,
  access_justification text,
  risk_level text NOT NULL DEFAULT 'medium',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE location_access_security_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to location audit logs
CREATE POLICY "location_audit_admin_only" 
ON location_access_security_audit 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- System can insert audit logs
CREATE POLICY "location_audit_system_insert" 
ON location_access_security_audit 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Add security audit log entry
INSERT INTO master_rls_security_audit (
  event_type,
  access_reason,
  additional_context
) VALUES (
  'GPS_LOCATION_SECURITY_HARDENING_CRITICAL',
  'Implemented admin-only GPS access and location anonymization to prevent stalking/theft',
  jsonb_build_object(
    'timestamp', NOW(),
    'security_level', 'critical_anti_stalking_protection',
    'affected_tables', ARRAY['delivery_tracking', 'delivery_providers'],
    'protection_features', ARRAY[
      'admin_only_gps_coordinates',
      'time_based_location_anonymization',
      'stalking_prevention_audit_logging',
      'theft_prevention_measures'
    ]
  )
);