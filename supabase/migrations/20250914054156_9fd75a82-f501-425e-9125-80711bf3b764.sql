-- COMPREHENSIVE FIX: Secure Delivery Provider Data Access ONCE AND FOR ALL
-- This permanently resolves the PUBLIC_DELIVERY_PROVIDER_DATA security issue

-- 1. Drop the problematic delivery_providers_safe view that lacks proper RLS
DROP VIEW IF EXISTS public.delivery_providers_safe CASCADE;

-- 2. Enable RLS on delivery_providers_public table if not already enabled
ALTER TABLE public.delivery_providers_public ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing permissive policies on delivery_providers_public
DROP POLICY IF EXISTS "Block all direct access to sensitive provider data" ON delivery_providers_public;

-- 4. Create ultra-restrictive RLS policies for delivery_providers_public
CREATE POLICY "delivery_providers_public_no_direct_access" ON delivery_providers_public
FOR ALL USING (false) WITH CHECK (false);

-- 5. Create secure directory function with proper authorization checks
CREATE OR REPLACE FUNCTION public.get_providers_directory_secure()
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  vehicle_types text[],
  service_areas text[],
  capacity_display text,
  is_verified boolean,
  is_active boolean,
  rating numeric,
  total_deliveries integer,
  contact_status text,
  can_contact boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_profile profiles%ROWTYPE;
  can_see_business_data boolean := false;
BEGIN
  -- Get current user profile with authentication check
  SELECT * INTO current_user_profile 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Require authentication
  IF current_user_profile.user_id IS NULL THEN
    -- Log unauthorized access attempt
    INSERT INTO delivery_access_log (
      user_id, resource_type, action, sensitive_fields_accessed
    ) VALUES (
      auth.uid(), 'provider_directory', 'UNAUTHORIZED_ACCESS_BLOCKED', 
      ARRAY['all_provider_data']
    );
    
    -- Return empty result set for unauthenticated users
    RETURN;
  END IF;
  
  -- Only authenticated builders and admins can see provider listings
  IF current_user_profile.role NOT IN ('admin', 'builder') THEN
    -- Log unauthorized role access attempt
    INSERT INTO delivery_access_log (
      user_id, resource_type, action, sensitive_fields_accessed
    ) VALUES (
      auth.uid(), 'provider_directory', 'UNAUTHORIZED_ROLE_BLOCKED', 
      ARRAY['provider_listings']
    );
    
    -- Return empty result set for unauthorized roles
    RETURN;
  END IF;
  
  -- Log legitimate directory access
  INSERT INTO delivery_access_log (
    user_id, resource_type, action, sensitive_fields_accessed
  ) VALUES (
    auth.uid(), 'provider_directory', 'AUTHORIZED_DIRECTORY_ACCESS', 
    ARRAY['basic_provider_info']
  );
  
  -- Only admins can see business-sensitive data
  can_see_business_data := current_user_profile.role = 'admin';
  
  -- Return ultra-protected directory
  RETURN QUERY
  SELECT 
    dp.id,
    dp.provider_name,
    dp.provider_type,
    dp.vehicle_types,
    dp.service_areas,
    -- PROTECTED: Capacity info hidden from competitors
    CASE 
      WHEN can_see_business_data THEN 
        COALESCE(dp.capacity_kg::text || ' kg', 'Contact for details')
      ELSE 'Contact provider for capacity'
    END as capacity_display,
    dp.is_verified,
    dp.is_active,
    dp.rating,
    dp.total_deliveries,
    -- Contact restrictions based on role
    CASE 
      WHEN current_user_profile.role = 'admin' THEN 'Admin access available'
      WHEN current_user_profile.role = 'builder' THEN 'Submit delivery request to contact'
      ELSE 'Register as builder to contact providers'
    END as contact_status,
    -- Can contact only through proper channels
    current_user_profile.role IN ('admin', 'builder') as can_contact
  FROM delivery_providers dp
  WHERE dp.is_active = TRUE 
  AND dp.is_verified = TRUE
  ORDER BY dp.rating DESC, dp.provider_name ASC;
END;
$$;

-- 6. Create secure individual provider access function
CREATE OR REPLACE FUNCTION public.get_provider_safe_individual(provider_uuid uuid)
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
  can_view_contact boolean,
  contact_method text,
  security_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_profile profiles%ROWTYPE;
  provider_record delivery_providers%ROWTYPE;
  can_access_contact boolean := false;
  access_reason text := 'unauthorized';
  has_active_business boolean := false;
BEGIN
  -- Get current user and provider
  SELECT * INTO current_user_profile FROM profiles WHERE user_id = auth.uid();
  SELECT * INTO provider_record FROM delivery_providers WHERE id = provider_uuid;
  
  -- Authentication and validation checks
  IF current_user_profile.user_id IS NULL THEN
    access_reason := 'unauthenticated_access_blocked';
  ELSIF provider_record.id IS NULL THEN
    access_reason := 'invalid_provider_request';
  ELSIF current_user_profile.role = 'admin' THEN
    can_access_contact := TRUE;
    access_reason := 'admin_access';
  ELSIF current_user_profile.id = provider_record.user_id THEN
    can_access_contact := TRUE;
    access_reason := 'provider_self_access';
  ELSIF current_user_profile.role = 'builder' THEN
    -- Only allow contact if there's an ACTIVE delivery request
    SELECT EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.provider_id = provider_uuid
      AND dr.builder_id = current_user_profile.id
      AND dr.status IN ('pending', 'accepted', 'in_progress')
      AND dr.created_at > NOW() - INTERVAL '24 hours'
    ) INTO has_active_business;
    
    IF has_active_business THEN
      can_access_contact := TRUE;
      access_reason := 'active_delivery_business';
    ELSE
      access_reason := 'no_active_business_contact_blocked';
    END IF;
  ELSE
    access_reason := 'role_not_authorized';
  END IF;
  
  -- Log ALL contact access attempts for security monitoring
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action, sensitive_fields_accessed
  ) VALUES (
    auth.uid(), provider_uuid, 'provider_contact', 
    CASE WHEN can_access_contact THEN 'AUTHORIZED_CONTACT_ACCESS' ELSE 'BLOCKED_CONTACT_ACCESS' END,
    CASE WHEN can_access_contact THEN ARRAY['contact_authorized'] ELSE ARRAY['contact_blocked'] END
  );
  
  -- Return contact decision with security message
  RETURN QUERY SELECT
    provider_record.id,
    provider_record.provider_name,
    provider_record.provider_type,
    provider_record.vehicle_types,
    provider_record.service_areas,
    provider_record.is_verified,
    provider_record.is_active,
    provider_record.rating,
    provider_record.total_deliveries,
    can_access_contact,
    CASE 
      WHEN can_access_contact THEN 'Direct contact authorized'
      ELSE 'Contact via delivery request system only'
    END,
    CASE 
      WHEN can_access_contact THEN 'Contact approved: ' || access_reason
      ELSE 'SECURITY: Contact blocked - ' || access_reason || '. Use delivery request system.'
    END;
END;
$$;

-- 7. Create trigger to detect provider data harvesting
CREATE OR REPLACE FUNCTION public.detect_provider_directory_harvesting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_directory_access_count integer;
  recent_provider_access_count integer;
  user_role text;
BEGIN
  -- Count recent directory and provider accesses
  SELECT COUNT(*) INTO recent_directory_access_count
  FROM delivery_access_log
  WHERE user_id = NEW.user_id
  AND resource_type = 'provider_directory'
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  SELECT COUNT(DISTINCT resource_id) INTO recent_provider_access_count
  FROM delivery_access_log
  WHERE user_id = NEW.user_id
  AND resource_type = 'provider_contact'
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = NEW.user_id;
  
  -- Detect potential harvesting
  IF (recent_directory_access_count > 3 OR recent_provider_access_count > 5) 
     AND user_role != 'admin' THEN
    
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      NEW.user_id,
      'CRITICAL_PROVIDER_DATA_HARVESTING',
      format('CRITICAL: Provider data harvesting detected - %s directory accesses, %s provider contacts in 10 minutes by %s role', 
             recent_directory_access_count, recent_provider_access_count, user_role)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create trigger for provider access monitoring
DROP TRIGGER IF EXISTS detect_provider_harvesting_trigger ON delivery_access_log;
CREATE TRIGGER detect_provider_harvesting_trigger
  AFTER INSERT ON delivery_access_log
  FOR EACH ROW
  WHEN (NEW.resource_type IN ('provider_directory', 'provider_contact'))
  EXECUTE FUNCTION detect_provider_directory_harvesting();

-- 9. Grant only necessary permissions
REVOKE ALL ON public.delivery_providers_public FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_providers_directory_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_safe_individual(uuid) TO authenticated;

-- 10. Log this comprehensive security fix
INSERT INTO security_events (
  event_type, 
  details, 
  severity, 
  user_id
) VALUES (
  'PROVIDER_DATA_EXPOSURE_PERMANENTLY_FIXED',
  jsonb_build_object(
    'description', 'COMPREHENSIVE FIX: Permanently secured all delivery provider data access points',
    'actions_taken', ARRAY[
      'dropped_insecure_delivery_providers_safe_view',
      'blocked_all_direct_table_access',
      'created_secure_directory_function',
      'implemented_role_based_access_control',
      'added_business_relationship_verification',
      'implemented_harvesting_detection',
      'revoked_all_public_permissions'
    ],
    'security_measures', ARRAY[
      'authentication_required',
      'role_authorization_required',
      'business_relationship_verification',
      'contact_access_restrictions',
      'comprehensive_audit_logging',
      'harvesting_pattern_detection'
    ],
    'functions_created', ARRAY[
      'get_providers_directory_secure',
      'get_provider_safe_individual',
      'detect_provider_directory_harvesting'
    ],
    'issue_resolution', 'PUBLIC_DELIVERY_PROVIDER_DATA permanently resolved',
    'timestamp', NOW()
  ),
  'critical',
  auth.uid()
);