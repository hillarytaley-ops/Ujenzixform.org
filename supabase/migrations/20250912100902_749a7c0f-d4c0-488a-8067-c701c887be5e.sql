-- Complete the security fix by adding only the missing secure functions

-- Create secure directory access function (replacing direct table access)
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
    -- Log unauthorized access attempt
    INSERT INTO provider_business_access_audit (
      user_id, provider_id, access_type,
      access_granted, access_justification, security_risk_level,
      sensitive_fields_accessed
    ) VALUES (
      auth.uid(), NULL, 'unauthenticated_directory_access',
      FALSE, 'Unauthenticated user attempted directory access', 'critical',
      ARRAY['all_provider_business_data']
    );
    RAISE EXCEPTION 'Authentication required for provider directory access';
  END IF;
  
  -- Log directory access attempt
  INSERT INTO provider_business_access_audit (
    user_id, provider_id, access_type,
    access_granted, access_justification, security_risk_level,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), NULL, 'secure_directory_access',
    TRUE, format('Directory access by %s role', user_profile_record.role), 'low',
    ARRAY['basic_provider_info']
  );
  
  -- Only admins can see business data
  can_see_business_data := user_profile_record.role = 'admin';
  
  -- Return ultra-protected directory with business data concealed from competitors
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
    -- PROTECTED: Capacity info hidden from competitors
    CASE 
      WHEN can_see_business_data THEN 
        COALESCE(dpp.capacity_kg::text || ' kg', 'Not specified')
      WHEN EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = dpp.provider_id 
        AND dp.user_id = user_profile_record.id
      ) THEN COALESCE(dpp.capacity_kg::text || ' kg', 'Not specified')
      ELSE 'Contact provider for capacity details'
    END as capacity_display,
    -- PROTECTED: Rate info completely hidden from competitors  
    CASE 
      WHEN can_see_business_data THEN 
        'KES ' || COALESCE(dpp.hourly_rate::text, '0') || '/hr, KES ' || COALESCE(dpp.per_km_rate::text, '0') || '/km'
      WHEN EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = dpp.provider_id 
        AND dp.user_id = user_profile_record.id
      ) THEN 'KES ' || COALESCE(dpp.hourly_rate::text, '0') || '/hr, KES ' || COALESCE(dpp.per_km_rate::text, '0') || '/km'
      ELSE 'Request quote for pricing'
    END as rate_display,
    -- Contact restrictions based on role
    CASE 
      WHEN user_profile_record.role = 'admin' THEN 'Full admin access available'
      WHEN user_profile_record.role = 'builder' THEN 'Submit delivery request to contact'
      WHEN user_profile_record.role = 'supplier' THEN 'Platform messaging only'
      ELSE 'Register to contact providers'
    END as contact_status
  FROM delivery_providers_public dpp
  WHERE dpp.is_active = TRUE 
  AND dpp.is_verified = TRUE
  ORDER BY dpp.rating DESC, dpp.provider_name ASC;
END;
$$;

-- Create function for requesting provider contact with strict verification
CREATE OR REPLACE FUNCTION request_provider_contact_secure(
  provider_uuid uuid,
  request_reason text DEFAULT 'business_inquiry'
)
RETURNS TABLE(
  provider_id uuid,
  provider_name text,
  can_contact boolean,
  contact_method text,
  business_justification text,
  security_notice text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  provider_record delivery_providers%ROWTYPE;
  can_access_contact BOOLEAN := FALSE;
  access_reason TEXT := 'unauthorized_contact_request';
  has_active_business BOOLEAN := FALSE;
BEGIN
  -- Get current user and provider
  SELECT * INTO user_profile_record FROM profiles WHERE user_id = auth.uid();
  SELECT * INTO provider_record FROM delivery_providers WHERE id = provider_uuid;
  
  -- Authentication and validation checks
  IF user_profile_record.user_id IS NULL THEN
    access_reason := 'unauthenticated_contact_request_blocked';
  ELSIF provider_record.id IS NULL THEN
    access_reason := 'invalid_provider_contact_request';
  ELSIF user_profile_record.role = 'admin' THEN
    can_access_contact := TRUE;
    access_reason := 'admin_contact_access';
  ELSIF user_profile_record.id = provider_record.user_id THEN
    can_access_contact := TRUE;
    access_reason := 'provider_self_contact_access';
  ELSIF user_profile_record.role = 'builder' THEN
    -- Only allow contact if there's an ACTIVE delivery request
    SELECT EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.provider_id = provider_uuid
      AND dr.builder_id = user_profile_record.id
      AND dr.status IN ('pending', 'accepted', 'in_progress')
      AND dr.created_at > NOW() - INTERVAL '24 hours'
    ) INTO has_active_business;
    
    IF has_active_business THEN
      can_access_contact := TRUE;
      access_reason := 'active_delivery_business_relationship';
    ELSE
      access_reason := 'no_active_business_relationship_contact_blocked';
    END IF;
  ELSE
    access_reason := 'role_not_authorized_for_provider_contact';
  END IF;
  
  -- Log ALL contact requests for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested,
    access_granted, business_relationship_verified, 
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), provider_uuid, request_reason,
    can_access_contact, has_active_business,
    access_reason, 
    CASE WHEN can_access_contact THEN 'low' ELSE 'high' END
  );
  
  -- Return contact decision
  RETURN QUERY SELECT
    provider_uuid,
    COALESCE(provider_record.provider_name, 'Unknown Provider'),
    can_access_contact,
    CASE 
      WHEN can_access_contact THEN 'Direct contact authorized'
      ELSE 'Contact via delivery request system only'
    END,
    access_reason,
    CASE 
      WHEN can_access_contact THEN 'Contact approved based on verified business relationship'
      ELSE 'SECURITY: Contact blocked - no active business relationship. Use delivery request system to establish contact.'
    END;
END;
$$;

-- Real-time harvesting detection trigger
CREATE OR REPLACE FUNCTION monitor_provider_contact_harvesting_realtime()
RETURNS TRIGGER AS $$
DECLARE
  recent_requests INTEGER;
  user_role TEXT;
BEGIN
  -- Count recent contact requests (last 10 minutes)
  SELECT COUNT(*) INTO recent_requests
  FROM provider_contact_security_audit
  WHERE user_id = NEW.user_id
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = NEW.user_id;
  
  -- Detect harvesting (more than 5 requests in 10 minutes)
  IF recent_requests > 5 AND user_role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      NEW.user_id,
      'CRITICAL_HARVESTING_DETECTED',
      format('Provider contact harvesting: %s requests in 10 minutes by %s role', 
             recent_requests, user_role)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply harvesting detection trigger
DROP TRIGGER IF EXISTS monitor_harvesting_trigger ON provider_contact_security_audit;
CREATE TRIGGER monitor_harvesting_trigger
  AFTER INSERT ON provider_contact_security_audit
  FOR EACH ROW
  EXECUTE FUNCTION monitor_provider_contact_harvesting_realtime();

-- Log security fix completion 
INSERT INTO emergency_security_log (
  event_type, 
  event_data, 
  user_id
) VALUES (
  'SECURITY_VULNERABILITY_RESOLVED',
  'Delivery provider business data exposure fixed: Direct table access blocked, secure functions implemented with audit logging',
  auth.uid()
);