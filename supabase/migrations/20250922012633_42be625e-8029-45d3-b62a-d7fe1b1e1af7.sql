-- CRITICAL SECURITY FIX: Secure delivery provider listings to protect driver personal data
-- This migration addresses vulnerabilities where authenticated users could access driver names and contact details

-- Step 1: Drop the insecure 'get_safe_provider_listings' function
DROP FUNCTION IF EXISTS public.get_safe_provider_listings();

-- Step 2: Create ultra-secure admin-only delivery provider directory function
CREATE OR REPLACE FUNCTION public.get_delivery_providers_admin_only()
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
  contact_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admin users can access delivery provider directory
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
      'admin_full_access'::text as contact_status
    FROM delivery_providers dp
    WHERE dp.is_active = true
    ORDER BY dp.provider_name;
  ELSE
    -- Non-admin users get no access - all driver data is protected
    RETURN;
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO provider_contact_security_audit (
    user_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'provider_directory_access', 
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin directory access granted'
      ELSE 'BLOCKED: Non-admin attempted provider directory access'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      ELSE 'critical'
    END
  );
END;
$$;

-- Step 3: Create secure function for verified business relationships only 
CREATE OR REPLACE FUNCTION public.get_providers_for_active_delivery_only()
RETURNS TABLE(
  id uuid,
  provider_name text,
  vehicle_types text[],
  service_areas text[],
  is_verified boolean,
  rating numeric,
  total_deliveries integer,
  contact_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
  has_active_delivery BOOLEAN := false;
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Check for active delivery relationship within last 48 hours
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.builder_id = current_user_profile_id
    AND dr.status IN ('pending', 'accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '48 hours'
  ) INTO has_active_delivery;
  
  -- Only users with verified active deliveries get limited non-personal data
  IF (current_user_role = 'builder' AND has_active_delivery) THEN
    RETURN QUERY
    SELECT 
      dp.id,
      'Provider Available'::text as provider_name,  -- Anonymized
      dp.vehicle_types,
      dp.service_areas,
      dp.is_verified,
      dp.rating,
      dp.total_deliveries,
      'contact_via_platform_only'::text as contact_status
    FROM delivery_providers dp
    WHERE dp.is_active = true AND dp.is_verified = true
    ORDER BY dp.rating DESC;
  ELSE
    -- No access for users without active delivery relationships
    RETURN;
  END IF;
  
  -- Log access attempt
  INSERT INTO provider_contact_security_audit (
    user_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'limited_provider_listings', 
    has_active_delivery,
    CASE 
      WHEN has_active_delivery THEN 'Active delivery - limited anonymous listings'
      ELSE 'BLOCKED: No active delivery relationship'
    END,
    CASE 
      WHEN has_active_delivery THEN 'medium'
      ELSE 'high'
    END
  );
END;
$$;

-- Step 4: Create business relationship verification table for strict access control
CREATE TABLE IF NOT EXISTS public.provider_business_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES public.profiles(id) NOT NULL,
  provider_id uuid REFERENCES public.delivery_providers(id) NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('active_delivery', 'admin_approved', 'business_partner')),
  verification_evidence jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  admin_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  UNIQUE(requester_id, provider_id, relationship_type)
);

-- Enable RLS on the new relationship table
ALTER TABLE public.provider_business_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can manage business relationships
CREATE POLICY "provider_relationships_admin_only" ON public.provider_business_relationships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 5: Update the existing delivery_providers RLS to be more restrictive
-- This ensures only admins can access any delivery provider data directly
DROP POLICY IF EXISTS "delivery_providers_absolute_admin_only_2024" ON public.delivery_providers;

CREATE POLICY "delivery_providers_ultra_secure_admin_only_2024" ON public.delivery_providers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 6: Create cleanup function for expired relationships
CREATE OR REPLACE FUNCTION public.cleanup_expired_provider_relationships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired relationships as inactive instead of deleting for audit trail
  UPDATE provider_business_relationships
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$$;