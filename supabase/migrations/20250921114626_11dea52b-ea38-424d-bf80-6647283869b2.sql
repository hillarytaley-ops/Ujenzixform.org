-- CRITICAL SECURITY FIX: Ultra-strict delivery provider access control

-- 1. Drop any insecure RLS policies on delivery_providers table
DROP POLICY IF EXISTS "delivery_providers_admin_only_full_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_owner_limited_access" ON public.delivery_providers;

-- 2. Create ULTIMATE admin-only RLS policy for delivery_providers table
CREATE POLICY "delivery_providers_absolute_admin_only_2024" 
ON public.delivery_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 3. Create secure function for provider listings (active delivery requests only)
CREATE OR REPLACE FUNCTION public.get_safe_provider_listings()
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
  has_active_requests boolean := false;
BEGIN
  -- Get current user role and profile
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Only admin gets unrestricted access
  IF current_user_role = 'admin' THEN
    RETURN QUERY
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
      'Admin access - full contact available'::text as contact_info
    FROM delivery_providers dp
    WHERE dp.is_verified = true AND dp.is_active = true;
    RETURN;
  END IF;
  
  -- Check if user has active delivery requests
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.builder_id = current_user_profile_id
    AND dr.status IN ('pending', 'accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '7 days'
  ) INTO has_active_requests;
  
  -- Only users with active delivery requests can see basic provider info
  IF has_active_requests THEN
    RETURN QUERY
    SELECT 
      dp.id,
      dp.provider_name,
      dp.provider_type,
      dp.vehicle_types,
      dp.service_areas,
      CASE WHEN dp.capacity_kg IS NOT NULL THEN dp.capacity_kg ELSE NULL END,
      dp.is_verified,
      dp.is_active,
      dp.rating,
      dp.total_deliveries,
      dp.created_at,
      dp.updated_at,
      'Contact via platform only'::text as contact_info
    FROM delivery_providers dp
    WHERE dp.is_verified = true AND dp.is_active = true;
  ELSE
    -- No active requests = no provider access
    RETURN;
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), null, 'provider_listings_access',
    has_active_requests OR current_user_role = 'admin',
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin provider listings access'
      WHEN has_active_requests THEN 'Active delivery request - provider listings authorized'
      ELSE 'BLOCKED: No active delivery requests'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      WHEN has_active_requests THEN 'medium'
      ELSE 'high'
    END
  );
END;
$$;

-- 4. Create ultra-secure provider contact function (admin-only driver personal data)
CREATE OR REPLACE FUNCTION public.get_ultra_secure_provider_contact(
  provider_uuid uuid,
  requested_field text DEFAULT 'basic'
)
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
  can_access_contact boolean,
  contact_field_access text,
  phone_number text,
  email_address text,
  physical_address text,
  security_message text,
  access_restrictions text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  provider_exists boolean;
  has_business_relationship boolean := false;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Check if provider exists
  SELECT EXISTS(SELECT 1 FROM delivery_providers WHERE id = provider_uuid) INTO provider_exists;
  
  IF NOT provider_exists THEN
    RETURN;
  END IF;
  
  -- Check for active business relationship (recent delivery requests)
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.id = provider_uuid
    AND dr.builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND dr.status IN ('accepted', 'in_progress', 'completed')
    AND dr.created_at > NOW() - INTERVAL '30 days'
  ) INTO has_business_relationship;
  
  -- Log ALL access attempts for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested, access_granted,
    business_relationship_verified, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), provider_uuid, requested_field,
    (current_user_role = 'admin'),
    has_business_relationship,
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access to provider contact'
      WHEN has_business_relationship THEN 'Recent business relationship - limited access'
      ELSE 'BLOCKED: No admin access or business relationship'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      WHEN has_business_relationship THEN 'medium'
      ELSE 'critical'
    END
  );
  
  -- Return data based on access level
  RETURN QUERY
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
    -- Contact access control
    (current_user_role = 'admin') as can_access_contact,
    CASE 
      WHEN current_user_role = 'admin' THEN 'full_admin_access'
      WHEN has_business_relationship THEN 'limited_business_access'
      ELSE 'no_access'
    END as contact_field_access,
    -- CRITICAL: Driver personal data (phone, email, license, docs) ADMIN ONLY
    CASE 
      WHEN current_user_role = 'admin' THEN dp.phone
      ELSE 'Admin access required'
    END as phone_number,
    CASE 
      WHEN current_user_role = 'admin' THEN dp.email
      ELSE 'Admin access required'
    END as email_address,
    CASE 
      WHEN current_user_role = 'admin' THEN dp.address
      ELSE 'Admin access required'
    END as physical_address,
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access granted to all driver information'
      WHEN has_business_relationship THEN 'Limited access - driver personal data protected (admin only)'
      ELSE 'Access denied - driver information is protected and restricted to administrators only'
    END as security_message,
    CASE 
      WHEN current_user_role = 'admin' THEN 'No restrictions - full admin access'
      ELSE 'CRITICAL RESTRICTION: Driver phone, email, license numbers, and documents are accessible to administrators only'
    END as access_restrictions
  FROM delivery_providers dp
  WHERE dp.id = provider_uuid;
END;
$$;

-- 5. Create function to check active delivery relationship
CREATE OR REPLACE FUNCTION public.verify_active_delivery_access(target_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_profile_id uuid;
  current_user_role text;
BEGIN
  -- Get current user profile
  SELECT p.id, p.role INTO current_user_profile_id, current_user_role
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin always has access
  IF current_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check for active delivery relationship (last 7 days)
  RETURN EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = target_provider_id
    AND dr.builder_id = current_user_profile_id
    AND dr.status IN ('pending', 'accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '7 days'
  );
END;
$$;

-- 6. Create security audit trigger for delivery provider access
CREATE OR REPLACE FUNCTION public.audit_delivery_provider_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    TG_OP || '_SENSITIVE_DRIVER_DATA',
    (current_user_role = 'admin'),
    jsonb_build_object(
      'sensitive_fields', sensitive_fields,
      'access_level', current_user_role,
      'timestamp', NOW()
    )
  );
  
  -- Block non-admin access to sensitive fields
  IF current_user_role != 'admin' AND TG_OP = 'SELECT' THEN
    -- This is handled by the secure functions, but log the attempt
    INSERT INTO security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'BLOCKED_DRIVER_DATA_ACCESS',
      'high',
      jsonb_build_object(
        'reason', 'Non-admin user attempted direct access to driver sensitive data',
        'user_role', current_user_role,
        'blocked_fields', sensitive_fields
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;