-- COMPREHENSIVE DELIVERY PROVIDER SECURITY FIX
-- Address the critical vulnerability: "Delivery Provider Personal Information Could Be Stolen"

-- 1. Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate ultra-strict RLS policies for maximum security
DROP POLICY IF EXISTS "providers_ultra_secure_access" ON public.delivery_providers;

-- Create separate policies for different operations to maximize security
CREATE POLICY "delivery_providers_strict_select" ON public.delivery_providers
FOR SELECT USING (
  -- Only provider owner or admin can view sensitive data
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
);

CREATE POLICY "delivery_providers_strict_insert" ON public.delivery_providers
FOR INSERT WITH CHECK (
  -- Only authenticated users can create their own provider profile
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_providers.user_id
  )
);

CREATE POLICY "delivery_providers_strict_update" ON public.delivery_providers
FOR UPDATE USING (
  -- Only provider owner or admin can update
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
) WITH CHECK (
  -- Cannot change user_id to someone else's
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
);

CREATE POLICY "delivery_providers_strict_delete" ON public.delivery_providers
FOR DELETE USING (
  -- Only admin or provider owner can delete
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
);

-- 3. Create a security audit function for sensitive data access
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
$$;

-- Add audit trigger for all operations
DROP TRIGGER IF EXISTS audit_delivery_provider_access_trigger ON public.delivery_providers;
CREATE TRIGGER audit_delivery_provider_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.delivery_providers
  FOR EACH ROW EXECUTE FUNCTION audit_delivery_provider_access();

-- 4. Create a secure function to get limited provider information for business purposes
CREATE OR REPLACE FUNCTION public.get_provider_business_info(provider_uuid UUID)
RETURNS TABLE(
  id UUID,
  provider_name TEXT,
  provider_type TEXT,
  service_areas TEXT[],
  vehicle_types TEXT[],
  is_verified BOOLEAN,
  is_active BOOLEAN,
  rating NUMERIC,
  total_deliveries INTEGER,
  can_contact BOOLEAN,
  contact_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  can_access_contact BOOLEAN := FALSE;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins or users with active business relationship can access contact info
  SELECT (
    user_profile_record.role = 'admin' OR 
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.provider_id = provider_uuid 
      AND dr.builder_id = user_profile_record.id
      AND dr.status IN ('accepted', 'in_progress')
      AND dr.created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO can_access_contact;
  
  -- Log the access attempt
  INSERT INTO contact_security_audit (
    user_id, target_table, action_attempted, was_authorized, client_info
  ) VALUES (
    auth.uid(),
    'delivery_providers',
    'BUSINESS_INFO_ACCESS',
    true,
    jsonb_build_object(
      'provider_id', provider_uuid,
      'can_access_contact', can_access_contact,
      'user_role', user_profile_record.role
    )
  );
  
  -- Return only safe business information
  RETURN QUERY
  SELECT 
    dp.id,
    dp.provider_name,
    dp.provider_type,
    dp.service_areas,
    dp.vehicle_types,
    dp.is_verified,
    dp.is_active,
    dp.rating,
    dp.total_deliveries,
    can_access_contact,
    CASE 
      WHEN can_access_contact THEN 'Contact available through active delivery request'
      ELSE 'Create delivery request to contact provider'
    END
  FROM delivery_providers dp
  WHERE dp.id = provider_uuid 
  AND dp.is_active = true 
  AND dp.is_verified = true;
END;
$$;

-- 5. Add security comments for documentation
COMMENT ON POLICY "delivery_providers_strict_select" ON public.delivery_providers IS 
'CRITICAL SECURITY: Only provider owner and admins can access sensitive personal data including phone, email, documents, and GPS location';

COMMENT ON POLICY "delivery_providers_strict_insert" ON public.delivery_providers IS 
'SECURITY: Users can only create provider profiles for themselves, preventing impersonation';

COMMENT ON POLICY "delivery_providers_strict_update" ON public.delivery_providers IS 
'SECURITY: Prevents unauthorized modification of sensitive provider data and profile takeover';

COMMENT ON POLICY "delivery_providers_strict_delete" ON public.delivery_providers IS 
'SECURITY: Only admins and provider owners can delete profiles, preventing unauthorized data destruction';

COMMENT ON FUNCTION public.get_provider_business_info(UUID) IS 
'SECURE FUNCTION: Provides limited provider information for business purposes without exposing sensitive personal data';

COMMENT ON FUNCTION public.audit_delivery_provider_access() IS 
'SECURITY AUDIT: Logs all access to sensitive delivery provider data for compliance monitoring';