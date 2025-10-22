-- FINAL DATABASE SECURITY HARDENING (CORRECTED)
-- Address remaining function search_path warnings

-- Update remaining functions to have immutable search_path
CREATE OR REPLACE FUNCTION public.detect_supplier_contact_harvesting_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    recent_supplier_access_count INTEGER;
    recent_contact_requests INTEGER;
    user_role TEXT;
BEGIN
    SELECT COUNT(DISTINCT supplier_id) INTO recent_supplier_access_count
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND supplier_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT COUNT(*) INTO recent_contact_requests
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'address', 'all')
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    IF (recent_supplier_access_count > 5 OR recent_contact_requests > 10) AND user_role != 'admin' THEN
        INSERT INTO supplier_contact_security_audit (
            user_id, supplier_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            NEW.user_id, NEW.supplier_id, 'HARVESTING_DETECTION',
            FALSE, 
            format('CRITICAL: Potential contact harvesting - %s suppliers, %s contact requests in 15min', 
                   recent_supplier_access_count, recent_contact_requests),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_provider_contact_harvesting_realtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.detect_location_stalking_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    recent_access_count INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent access attempts by this user
    SELECT COUNT(*) INTO recent_access_count
    FROM location_access_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Detect suspicious patterns
    IF recent_access_count > 10 AND user_role != 'admin' THEN
        -- Log potential stalking behavior
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, location_data_type,
            access_justification, risk_level
        ) VALUES (
            NEW.user_id, 'PATTERN_DETECTION', 'suspicious',
            format('POTENTIAL STALKING: %s location accesses in 10 minutes', recent_access_count),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_delivery_provider_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  sensitive_fields TEXT[] := ARRAY[
    'phone', 'email', 'address', 'driving_license_number', 
    'national_id_document_path', 'cv_document_path', 
    'good_conduct_document_path', 'current_latitude', 'current_longitude'
  ];
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log access to sensitive provider data
  INSERT INTO contact_security_audit (
    user_id, target_table, action_attempted, was_authorized, client_info
  ) VALUES (
    auth.uid(),
    'delivery_providers',
    TG_OP || '_SENSITIVE_PROVIDER_DATA',
    true, -- If this trigger fires, access was authorized
    jsonb_build_object(
      'provider_id', COALESCE(NEW.id, OLD.id),
      'user_role', current_user_role,
      'timestamp', NOW(),
      'sensitive_fields_exposed', sensitive_fields
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO contact_security_audit (
    user_id, target_table, action_attempted, was_authorized, client_info
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP || '_SENSITIVE_DATA',
    true,
    jsonb_build_object(
      'timestamp', NOW(),
      'record_id', COALESCE(NEW.id, OLD.id),
      'table', TG_TABLE_NAME
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_qr_code_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Call the edge function to generate QR code asynchronously
  -- This will be handled by the application layer when a new PO is created
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_address_access_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  recent_address_access_count integer;
  user_role text;
BEGIN
  -- Count recent address access attempts by this user
  SELECT COUNT(*) INTO recent_address_access_count
  FROM delivery_access_log
  WHERE user_id = auth.uid()
  AND resource_type ILIKE '%address%'
  AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Detect potential address harvesting (more than 10 address accesses in 15 minutes)
  IF recent_address_access_count > 10 AND user_role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      auth.uid(),
      'POTENTIAL_ADDRESS_HARVESTING',
      format('CRITICAL: Potential address harvesting detected - %s address accesses in 15 minutes by %s role', 
             recent_address_access_count, user_role)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;