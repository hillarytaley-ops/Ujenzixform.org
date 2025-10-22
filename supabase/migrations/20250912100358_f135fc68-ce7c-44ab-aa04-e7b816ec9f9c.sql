-- EMERGENCY FIX: Replace overly permissive provider business access with ultra-strict controls

-- Drop the current permissive policy
DROP POLICY IF EXISTS "Restricted provider business access with audit" ON public.delivery_providers_public;

-- Create ultra-strict policy that only allows access with verified business relationships
CREATE POLICY "Ultra strict provider business access"
ON public.delivery_providers_public FOR SELECT
USING (
  -- Only allow access if user has admin role OR has active business relationship
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND (
      -- Admin access
      p.role = 'admin' OR
      -- Provider can see their own listing
      EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = delivery_providers_public.provider_id 
        AND dp.user_id = p.id
      ) OR
      -- Builder with ACTIVE delivery request in last 24 hrs
      (p.role = 'builder' AND EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.provider_id = delivery_providers_public.provider_id
        AND dr.builder_id = p.id
        AND dr.status IN ('pending', 'accepted', 'in_progress')
        AND dr.created_at > NOW() - INTERVAL '24 hours'
      )) OR
      -- Supplier with ACTIVE delivery coordination in last 24 hrs
      (p.role = 'supplier' AND EXISTS (
        SELECT 1 FROM deliveries d
        JOIN delivery_requests dr ON dr.builder_id = d.builder_id
        WHERE dr.provider_id = delivery_providers_public.provider_id
        AND d.supplier_id = p.id
        AND dr.status IN ('accepted', 'in_progress')
        AND dr.created_at > NOW() - INTERVAL '24 hours'
      ))
    )
  )
);

-- Create comprehensive audit trigger for all access attempts
CREATE OR REPLACE FUNCTION audit_provider_directory_access()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  access_granted BOOLEAN := FALSE;
  access_reason TEXT := 'unauthorized_directory_access';
BEGIN
  -- Get user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log every access attempt with detailed reasoning
  IF user_profile_record.role = 'admin' THEN
    access_granted := TRUE;
    access_reason := 'admin_directory_access';
  ELSIF EXISTS (
    SELECT 1 FROM delivery_providers dp 
    WHERE dp.id = NEW.provider_id 
    AND dp.user_id = user_profile_record.id
  ) THEN
    access_granted := TRUE;
    access_reason := 'provider_self_directory_access';
  ELSIF user_profile_record.role = 'builder' AND EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = NEW.provider_id
    AND dr.builder_id = user_profile_record.id
    AND dr.status IN ('pending', 'accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    access_granted := TRUE;
    access_reason := 'builder_active_delivery_directory_access';
  ELSE
    access_granted := FALSE;
    access_reason := 'unauthorized_competitor_directory_access_blocked';
  END IF;
  
  -- Log to audit table
  INSERT INTO provider_business_access_audit (
    user_id, provider_id, access_type,
    access_granted, access_justification, security_risk_level,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), NEW.provider_id, 'directory_access',
    access_granted, access_reason,
    CASE WHEN access_granted THEN 'low' ELSE 'critical' END,
    CASE WHEN access_granted 
         THEN ARRAY['basic_directory_info']
         ELSE ARRAY['hourly_rate', 'per_km_rate', 'capacity_kg', 'service_areas']
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to the public table
DROP TRIGGER IF EXISTS audit_provider_directory_access_trigger ON public.delivery_providers_public;
CREATE TRIGGER audit_provider_directory_access_trigger
  AFTER SELECT ON public.delivery_providers_public
  FOR EACH ROW
  EXECUTE FUNCTION audit_provider_directory_access();

-- Create secure directory function for controlled access
CREATE OR REPLACE FUNCTION get_delivery_providers_directory_secure()
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  vehicle_types text[],
  service_areas text[],
  is_verified boolean,
  is_active boolean,
  rating numeric,
  total_deliveries integer,
  capacity_display text,
  rate_display text,
  contact_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  can_see_business_data BOOLEAN := FALSE;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Require authentication
  IF user_profile_record.user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for provider directory access';
  END IF;
  
  -- Log directory access attempt
  INSERT INTO provider_business_access_audit (
    user_id, provider_id, access_type,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), NULL, 'secure_directory_access',
    TRUE, format('Secure directory access by %s', user_profile_record.role), 'low'
  );
  
  -- Determine access level
  can_see_business_data := user_profile_record.role = 'admin';
  
  -- Return filtered directory with business data protection
  RETURN QUERY
  SELECT 
    dpp.id,
    dpp.provider_name,
    dpp.provider_type,
    dpp.vehicle_types,
    dpp.service_areas,
    dpp.is_verified,
    dpp.is_active,
    dpp.rating,
    dpp.total_deliveries,
    -- Protected capacity display
    CASE 
      WHEN can_see_business_data OR EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = dpp.provider_id 
        AND dp.user_id = user_profile_record.id
      ) THEN dpp.capacity_kg::text || ' kg'
      ELSE 'Available on request'
    END,
    -- Protected rate display  
    CASE 
      WHEN can_see_business_data OR EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = dpp.provider_id 
        AND dp.user_id = user_profile_record.id
      ) THEN 'KES ' || COALESCE(dpp.hourly_rate::text, '0') || '/hr, ' || COALESCE(dpp.per_km_rate::text, '0') || '/km'
      ELSE 'Rates available on request'
    END,
    -- Contact status
    CASE 
      WHEN user_profile_record.role = 'admin' THEN 'Full access available'
      WHEN user_profile_record.role = 'builder' THEN 'Contact via delivery request'
      ELSE 'Contact via platform only'
    END
  FROM delivery_providers_public dpp
  WHERE dpp.is_active = TRUE 
  AND dpp.is_verified = TRUE
  ORDER BY dpp.rating DESC, dpp.provider_name ASC;
END;
$$;

-- Log security improvement
INSERT INTO emergency_security_log (
  event_type, 
  event_data, 
  user_id
) VALUES (
  'CRITICAL_SECURITY_FIX_APPLIED',
  'Fixed delivery provider business data exposure - implemented ultra-strict access controls',
  auth.uid()
);