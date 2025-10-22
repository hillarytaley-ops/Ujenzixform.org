-- Ultra-secure delivery providers table protection
-- Drop any existing policies first
DROP POLICY IF EXISTS "delivery_providers_admin_only_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_public_total_lockdown" ON public.delivery_providers_public;

-- Create ultra-strict RLS policies for delivery_providers table
-- CRITICAL: This table contains sensitive contact information

-- Admin-only access to full delivery provider data
CREATE POLICY "delivery_providers_ultra_secure_admin_access" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Providers can only access their own data
CREATE POLICY "delivery_providers_self_access_only" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
);

-- Providers can only update their own data (but not contact details in some cases)
CREATE POLICY "delivery_providers_self_update_limited" 
ON public.delivery_providers
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
);

-- Completely lock down delivery_providers_public table
-- No direct access - only through secure functions
CREATE POLICY "delivery_providers_public_complete_lockdown" 
ON public.delivery_providers_public
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);

-- Create ultra-secure function for getting provider directory without exposing contact info
CREATE OR REPLACE FUNCTION public.get_ultra_secure_provider_contact(
  provider_uuid UUID,
  requested_field TEXT DEFAULT 'basic'
)
RETURNS TABLE(
  id UUID,
  provider_name TEXT,
  provider_type TEXT,
  vehicle_types TEXT[],
  service_areas TEXT[],
  capacity_kg NUMERIC,
  is_verified BOOLEAN,
  is_active BOOLEAN,
  rating NUMERIC,
  total_deliveries INTEGER,
  can_access_contact BOOLEAN,
  contact_field_access TEXT,
  phone_number TEXT,
  email_address TEXT,
  physical_address TEXT,
  security_message TEXT,
  access_restrictions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  provider_record delivery_providers%ROWTYPE;
  can_access_contact BOOLEAN := FALSE;
  business_relationship_verified BOOLEAN := FALSE;
  access_justification TEXT := 'unauthorized_access_blocked';
  risk_level TEXT := 'critical';
  active_business_exists BOOLEAN := FALSE;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Reject unauthenticated access immediately
  IF user_profile_record.user_id IS NULL THEN
    INSERT INTO provider_contact_security_audit (
      user_id, provider_id, contact_field_requested,
      access_granted, access_justification, security_risk_level
    ) VALUES (
      auth.uid(), provider_uuid, requested_field,
      FALSE, 'Unauthenticated access to provider contact blocked', 'critical'
    );
    RETURN;
  END IF;
  
  -- Get provider record using service role privileges
  SELECT * INTO provider_record 
  FROM delivery_providers 
  WHERE id = provider_uuid;
  
  IF provider_record.id IS NULL THEN
    INSERT INTO provider_contact_security_audit (
      user_id, provider_id, contact_field_requested,
      access_granted, access_justification, security_risk_level
    ) VALUES (
      auth.uid(), provider_uuid, requested_field,
      FALSE, 'Provider not found or access denied', 'critical'
    );
    RETURN;
  END IF;
  
  -- ULTRA-STRICT PROVIDER CONTACT ACCESS VERIFICATION
  IF user_profile_record.role = 'admin' THEN
    can_access_contact := TRUE;
    access_justification := 'admin_access';
    risk_level := 'low';
    
  ELSIF user_profile_record.id = provider_record.user_id THEN
    can_access_contact := TRUE;
    access_justification := 'provider_self_access';
    risk_level := 'low';
    
  ELSIF user_profile_record.role = 'builder' THEN
    -- Check for ACTIVE delivery request relationship
    SELECT EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.provider_id = provider_uuid 
      AND dr.builder_id = user_profile_record.id
      AND dr.status IN ('accepted', 'in_progress')
      AND dr.created_at > NOW() - INTERVAL '24 hours'
    ) INTO active_business_exists;
    
    IF active_business_exists THEN
      can_access_contact := TRUE;
      access_justification := 'active_delivery_relationship';
      risk_level := 'medium';
      business_relationship_verified := TRUE;
    ELSE
      can_access_contact := FALSE;
      access_justification := 'no_active_business_relationship';
      risk_level := 'high';
    END IF;
    
  ELSE
    can_access_contact := FALSE;
    access_justification := 'insufficient_authorization';
    risk_level := 'critical';
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested,
    access_granted, business_relationship_verified, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), provider_uuid, requested_field,
    can_access_contact, business_relationship_verified, access_justification, risk_level
  );
  
  -- Return ultra-protected data
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
    can_access_contact,
    CASE 
      WHEN can_access_contact THEN requested_field 
      ELSE 'restricted' 
    END,
    -- Ultra-strict phone protection
    CASE 
      WHEN can_access_contact AND requested_field IN ('phone', 'all') AND active_business_exists 
      THEN provider_record.phone
      ELSE NULL
    END,
    -- Ultra-strict email protection  
    CASE 
      WHEN can_access_contact AND requested_field IN ('email', 'all') AND business_relationship_verified
      THEN provider_record.email
      ELSE NULL
    END,
    -- Ultra-strict address protection
    CASE 
      WHEN can_access_contact AND requested_field IN ('address', 'all') AND business_relationship_verified
      THEN provider_record.address
      ELSE 'Location available to authorized partners only'
    END,
    CASE
      WHEN can_access_contact THEN 'Authorized: ' || access_justification
      ELSE 'Restricted: ' || access_justification
    END,
    CASE
      WHEN NOT can_access_contact THEN 'Contact protected - active delivery relationship required'
      WHEN active_business_exists THEN 'Full contact access for active delivery'
      ELSE 'Limited access restrictions apply'
    END;
END;
$$;

-- Create secure function for safe provider listings (basic info only)
CREATE OR REPLACE FUNCTION public.get_safe_provider_listings()
RETURNS TABLE(
  id UUID,
  provider_name TEXT,
  provider_type TEXT,
  vehicle_types TEXT[],
  service_areas TEXT[],
  capacity_kg NUMERIC,
  is_verified BOOLEAN,
  is_active BOOLEAN,
  rating NUMERIC,
  total_deliveries INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  contact_info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for provider directory access';
  END IF;
  
  -- Log directory access
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), NULL, 'provider_directory_listing',
    TRUE, 'Authenticated user accessing safe provider directory', 'low'
  );
  
  -- Return only safe, non-sensitive provider information
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
    'Contact via secure delivery request system' as contact_info
  FROM delivery_providers dp
  WHERE dp.is_active = TRUE 
  AND dp.is_verified = TRUE
  ORDER BY dp.rating DESC, dp.provider_name ASC;
END;
$$;

-- Create audit table for provider contact access monitoring
CREATE TABLE IF NOT EXISTS public.provider_contact_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider_id UUID,
  contact_field_requested TEXT NOT NULL,
  access_granted BOOLEAN DEFAULT FALSE,
  business_relationship_verified BOOLEAN DEFAULT FALSE,
  access_justification TEXT,
  security_risk_level TEXT DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE public.provider_contact_security_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "provider_contact_audit_admin_only" 
ON public.provider_contact_security_audit
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- System can insert audit logs
CREATE POLICY "provider_contact_audit_system_insert" 
ON public.provider_contact_security_audit
FOR INSERT 
TO authenticated
WITH CHECK (TRUE);

-- Create trigger to detect provider contact harvesting
CREATE OR REPLACE FUNCTION public.monitor_provider_contact_harvesting_realtime()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for real-time harvesting detection
CREATE OR REPLACE TRIGGER provider_contact_harvesting_monitor
  AFTER INSERT ON public.provider_contact_security_audit
  FOR EACH ROW EXECUTE FUNCTION public.monitor_provider_contact_harvesting_realtime();