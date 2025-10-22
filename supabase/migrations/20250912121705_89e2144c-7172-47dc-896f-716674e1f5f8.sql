-- DELIVERY PROVIDER SECURITY FIX - Part 1: Drop existing function
DROP FUNCTION IF EXISTS public.get_provider_business_info(UUID);

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

-- Add security comments for documentation
COMMENT ON POLICY "delivery_providers_strict_select" ON public.delivery_providers IS 
'CRITICAL SECURITY: Only provider owner and admins can access sensitive personal data including phone, email, documents, and GPS location';

COMMENT ON POLICY "delivery_providers_strict_insert" ON public.delivery_providers IS 
'SECURITY: Users can only create provider profiles for themselves, preventing impersonation';

COMMENT ON POLICY "delivery_providers_strict_update" ON public.delivery_providers IS 
'SECURITY: Prevents unauthorized modification of sensitive provider data and profile takeover';

COMMENT ON POLICY "delivery_providers_strict_delete" ON public.delivery_providers IS 
'SECURITY: Only admins and provider owners can delete profiles, preventing unauthorized data destruction';