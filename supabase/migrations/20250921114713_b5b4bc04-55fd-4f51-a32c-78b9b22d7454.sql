-- CRITICAL SECURITY FIX: Ultra-strict delivery provider access control (Fixed)

-- 1. Ensure proper RLS policy exists (skip if already exists)
DO $$ 
BEGIN
    -- Check if policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_providers' 
        AND policyname = 'delivery_providers_absolute_admin_only_2024'
    ) THEN
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
    END IF;
END $$;

-- 2. Create secure function for provider listings (active delivery requests only)
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
      'Admin access - contact via secure request only'::text as contact_info
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
      'Contact via platform only - driver info protected'::text as contact_info
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

-- 3. Create ultra-secure provider contact function (admin-only driver personal data)
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
      ELSE 'RESTRICTED: Admin access required for driver phone number'
    END as phone_number,
    CASE 
      WHEN current_user_role = 'admin' THEN dp.email
      ELSE 'RESTRICTED: Admin access required for driver email'
    END as email_address,
    CASE 
      WHEN current_user_role = 'admin' THEN dp.address
      ELSE 'RESTRICTED: Admin access required for driver address'
    END as physical_address,
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access granted to all driver information including phone, email, license numbers and document paths'
      WHEN has_business_relationship THEN 'Limited access - driver personal data (phone, email, license, documents) protected (admin only)'
      ELSE 'Access denied - driver information is protected and restricted to administrators only'
    END as security_message,
    CASE 
      WHEN current_user_role = 'admin' THEN 'No restrictions - full admin access to all driver personal data'
      ELSE 'CRITICAL RESTRICTION: Driver phone numbers, email addresses, driving license numbers, and document paths are accessible to administrators only'
    END as access_restrictions
  FROM delivery_providers dp
  WHERE dp.id = provider_uuid;
END;
$$;