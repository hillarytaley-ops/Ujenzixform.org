-- CRITICAL FIX: Ultra-strict access controls for delivery provider business data

-- Drop the problematic policy and function
DROP POLICY IF EXISTS "Ultra strict provider business access" ON public.delivery_providers_public;
DROP POLICY IF EXISTS "Restricted provider business access with audit" ON public.delivery_providers_public;

-- Create ZERO-ACCESS policy - block all direct table access
CREATE POLICY "Block all direct access to sensitive provider data"
ON public.delivery_providers_public FOR SELECT
USING (FALSE); -- No direct access allowed

-- Create secure directory access function that replaces direct table access
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
  has_active_business BOOLEAN := FALSE;
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
  
  -- Log all directory access attempts
  INSERT INTO provider_business_access_audit (
    user_id, provider_id, access_type,
    access_granted, access_justification, security_risk_level,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), NULL, 'secure_directory_access',
    TRUE, format('Directory access by %s role', user_profile_record.role), 'low',
    ARRAY['basic_provider_info']
  );
  
  -- Determine business data access level
  can_see_business_data := user_profile_record.role = 'admin';
  
  -- Return ultra-protected directory with business data concealed
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
    -- PROTECTED: Capacity info only for admins and self
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
    -- Contact restrictions
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

-- Create function for requesting specific provider contact (with strict business verification)
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
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get provider record
  SELECT * INTO provider_record 
  FROM delivery_providers 
  WHERE id = provider_uuid;
  
  -- Require authentication
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
    -- Check for ACTIVE delivery request within 24 hours
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
      can_access_contact := FALSE;
      access_reason := 'no_active_business_relationship_contact_blocked';
    END IF;
  ELSE
    can_access_contact := FALSE;
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
  
  -- Return contact decision with security info
  RETURN QUERY SELECT
    provider_uuid,
    provider_record.provider_name,
    can_access_contact,
    CASE 
      WHEN can_access_contact THEN 'Direct contact authorized'
      ELSE 'Contact via delivery request system only'
    END,
    access_reason,
    CASE 
      WHEN can_access_contact THEN 'Contact approved based on business relationship'
      ELSE 'SECURITY: Contact blocked - no active business relationship. Use delivery request system.'
    END;
END;
$$;

-- Create real-time harvesting detection function
CREATE OR REPLACE FUNCTION monitor_provider_contact_harvesting_realtime()
RETURNS TRIGGER AS $$
DECLARE
  recent_requests INTEGER;
  user_role TEXT;
BEGIN
  -- Count recent contact requests by this user (last 10 minutes)
  SELECT COUNT(*) INTO recent_requests
  FROM provider_contact_security_audit
  WHERE user_id = NEW.user_id
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Detect potential harvesting (more than 5 requests in 10 minutes)
  IF recent_requests > 5 AND user_role != 'admin' THEN
    -- Log critical security alert
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      NEW.user_id,
      'CRITICAL_HARVESTING_DETECTED',
      format('Provider contact harvesting detected: %s requests in 10 minutes by %s role', 
             recent_requests, user_role)
    );
    
    -- Log in audit table as well
    INSERT INTO provider_contact_security_audit (
      user_id, provider_id, contact_field_requested,
      access_granted, access_justification, security_risk_level
    ) VALUES (
      NEW.user_id, NEW.provider_id, 'HARVESTING_PATTERN_DETECTED',
      FALSE,
      format('CRITICAL: %s contact requests in 10 minutes - likely harvesting', recent_requests),
      'critical'
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

-- Log critical security fix
INSERT INTO emergency_security_log (
  event_type, 
  event_data, 
  user_id
) VALUES (
  'CRITICAL_VULNERABILITY_FIXED',
  'Delivery provider business data exposure completely secured - direct table access blocked, secure functions implemented',
  auth.uid()
);