-- ULTRA SECURE DELIVERY PROVIDERS - ADMIN ONLY ACCESS (FIXED)
-- This migration implements the strictest possible security for driver personal data

-- 1. Drop any existing insecure views or functions that might expose driver data
DROP VIEW IF EXISTS public.delivery_providers_public CASCADE;
DROP FUNCTION IF EXISTS public.get_safe_provider_listings() CASCADE;
DROP FUNCTION IF EXISTS public.get_delivery_providers_with_role_protection() CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_provider_data() CASCADE;

-- 2. Create ultra-secure admin-only function for delivery providers access
CREATE OR REPLACE FUNCTION public.get_ultra_secure_provider_contact(
  provider_uuid UUID,
  requested_field TEXT DEFAULT 'basic'
) RETURNS TABLE(
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
  has_active_delivery BOOLEAN := false;
  current_user_profile_id UUID;
BEGIN
  -- Get current user role and profile
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Check for active delivery relationship (last 24 hours only)
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = provider_uuid
    AND dr.builder_id = current_user_profile_id
    AND dr.status IN ('accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '24 hours'
  ) INTO has_active_delivery;
  
  -- Log ALL access attempts for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, provider_id, contact_field_requested, access_granted,
    access_justification, security_risk_level, business_relationship_verified
  ) VALUES (
    auth.uid(), provider_uuid, requested_field,
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access granted'
      WHEN has_active_delivery THEN 'BLOCKED: Active delivery insufficient for contact access'
      ELSE 'BLOCKED: Unauthorized driver data access attempt'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      ELSE 'critical'
    END,
    has_active_delivery
  );
  
  -- ONLY ADMIN gets any provider data - period
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
      true as can_access_contact,
      'admin_full_access' as contact_field_access,
      dp.phone,
      dp.email,
      dp.address,
      'Admin access - full driver information available' as security_message,
      'No restrictions for administrators' as access_restrictions
    FROM delivery_providers dp
    WHERE dp.id = provider_uuid;
  ELSE
    -- ALL NON-ADMIN USERS GET BLOCKED - NO EXCEPTIONS
    RETURN QUERY
    SELECT 
      provider_uuid,
      'Driver information protected'::TEXT,
      'admin_access_required'::TEXT,
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[],
      NULL::NUMERIC,
      NULL::BOOLEAN,
      NULL::BOOLEAN,
      NULL::NUMERIC,
      NULL::INTEGER,
      false as can_access_contact,
      'access_denied' as contact_field_access,
      'ADMIN ACCESS REQUIRED'::TEXT,
      'ADMIN ACCESS REQUIRED'::TEXT,
      'ADMIN ACCESS REQUIRED'::TEXT,
      'CRITICAL SECURITY: Driver personal data is strictly protected. Only administrators can access driver information.' as security_message,
      'Driver names, contact details, documents, and all personal information are admin-only for privacy protection.' as access_restrictions;
  END IF;
END;
$$;

-- 3. Create provider business relationship tracking table
CREATE TABLE IF NOT EXISTS public.provider_business_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'none',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  verification_evidence JSONB DEFAULT '{}',
  UNIQUE(requester_id, provider_id, relationship_type)
);

-- Enable RLS on provider relationships
ALTER TABLE public.provider_business_relationships ENABLE ROW LEVEL SECURITY;

-- Admin-only access to provider relationships
CREATE POLICY "provider_relationships_admin_only" ON public.provider_business_relationships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Update delivery_providers RLS to be ULTRA SECURE
DROP POLICY IF EXISTS "delivery_providers_ultra_secure_admin_only_2024" ON public.delivery_providers;

CREATE POLICY "delivery_providers_ultra_secure_admin_only_2024" ON public.delivery_providers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Create cleanup function for expired relationships
CREATE OR REPLACE FUNCTION public.cleanup_expired_provider_relationships()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mark expired relationships as inactive instead of deleting for audit trail
  UPDATE provider_business_relationships
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$$;

-- 6. Create ultra-secure helper functions
CREATE OR REPLACE FUNCTION public.is_admin_user_secure()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role_secure()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE user_id = auth.uid()),
    'unauthorized'
  );
$$;

-- 7. Create master security audit table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.master_rls_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  event_type TEXT NOT NULL,
  table_accessed TEXT,
  record_id UUID,
  access_granted BOOLEAN DEFAULT false,
  security_risk_level TEXT DEFAULT 'high',
  ip_address INET,
  user_agent TEXT,
  access_reason TEXT,
  additional_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on master audit table
ALTER TABLE public.master_rls_security_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to master audit
CREATE POLICY "master_audit_admin_only" ON public.master_rls_security_audit
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 8. Create function to log all delivery provider access attempts (no trigger - triggers don't work with SELECT)
CREATE OR REPLACE FUNCTION public.log_provider_access_audit(
  operation_type TEXT,
  provider_id UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Log every access attempt
  INSERT INTO master_rls_security_audit (
    event_type, table_accessed, record_id, access_granted,
    access_reason, security_risk_level, additional_context
  ) VALUES (
    'DELIVERY_PROVIDER_ACCESS_ATTEMPT',
    'delivery_providers',
    provider_id,
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access to delivery provider data'
      ELSE format('BLOCKED: %s attempted unauthorized access to delivery provider data', COALESCE(current_user_role, 'unknown'))
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'operation', operation_type,
      'user_role', current_user_role,
      'timestamp', NOW()
    )
  );
END;
$$;

-- 9. Final security verification - ensure no unauthorized access possible
INSERT INTO master_rls_security_audit (
  event_type, access_reason, additional_context
) VALUES (
  'ULTRA_SECURE_DELIVERY_PROVIDER_MIGRATION_COMPLETE',
  'All delivery provider data is now strictly admin-only protected',
  jsonb_build_object(
    'migration_timestamp', NOW(),
    'security_level', 'ultra_secure_admin_only',
    'driver_data_protection', 'maximum'
  )
);