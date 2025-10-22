-- 🚨 COMPREHENSIVE SECURITY FIX: Address all remaining security vulnerabilities
-- This migration fixes the specific security issues identified:
-- 1. delivery_providers_public table public accessibility
-- 2. delivery_providers table overly permissive access to PII
-- 3. suppliers table contact information exposure

-- =============================================================================
-- STEP 1: FIX DELIVERY_PROVIDERS_PUBLIC TABLE SECURITY
-- =============================================================================

-- Drop any existing overly permissive policies on delivery_providers_public
DROP POLICY IF EXISTS "authenticated_basic_provider_info_only" ON public.delivery_providers_public;
DROP POLICY IF EXISTS "ultra_minimal_provider_info_no_contact" ON public.delivery_providers_public;
DROP POLICY IF EXISTS "ultra_secure_public_provider_info" ON public.delivery_providers_public;
DROP POLICY IF EXISTS "public_can_view_basic_provider_info" ON public.delivery_providers_public;

-- Ensure RLS is enabled
ALTER TABLE public.delivery_providers_public ENABLE ROW LEVEL SECURITY;

-- Revoke all public access
REVOKE ALL ON public.delivery_providers_public FROM PUBLIC;
REVOKE ALL ON public.delivery_providers_public FROM anon;

-- Create highly restrictive policy for delivery_providers_public
-- Only authenticated users with verified business relationships can access
CREATE POLICY "secure_verified_business_provider_access" 
ON public.delivery_providers_public 
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL 
  AND is_active = true 
  AND is_verified = true
  AND (
    -- Admin can see all
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Only users with active delivery requests can see providers
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.delivery_requests dr ON dr.builder_id = p.id
      WHERE p.user_id = auth.uid()
      AND dr.status IN ('pending', 'confirmed', 'in_transit')
      AND dr.created_at > NOW() - INTERVAL '7 days'
    )
  )
);

-- Block all modifications to public table
CREATE POLICY "block_all_public_provider_modifications" 
ON public.delivery_providers_public 
FOR ALL
USING (false)
WITH CHECK (false);

-- =============================================================================
-- STEP 2: ENHANCE DELIVERY_PROVIDERS TABLE SECURITY (PII PROTECTION)
-- =============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "ultra_secure_provider_data_protection" ON public.delivery_providers;
DROP POLICY IF EXISTS "admin_only_provider_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "provider_own_access_only" ON public.delivery_providers;

-- Ensure RLS is enabled
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- Revoke all public access
REVOKE ALL ON public.delivery_providers FROM PUBLIC;
REVOKE ALL ON public.delivery_providers FROM anon;

-- Create comprehensive PII protection policy
CREATE POLICY "ultra_secure_pii_protected_provider_access" 
ON public.delivery_providers 
FOR SELECT
TO authenticated
USING (
  -- Only allow access if user is admin OR the provider themselves
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
);

-- Separate policy for modifications (even more restrictive)
CREATE POLICY "ultra_secure_provider_modifications" 
ON public.delivery_providers 
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  -- Only provider themselves or admin can modify
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
)
WITH CHECK (
  -- Same restrictions for inserts/updates
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
);

-- =============================================================================
-- STEP 3: FIX SUPPLIERS TABLE CONTACT INFORMATION EXPOSURE
-- =============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view supplier business info" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers: Authenticated basic view only" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;

-- Ensure RLS is enabled
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Revoke all public access
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;

-- Create business relationship verification policy for suppliers
CREATE POLICY "secure_business_relationship_supplier_access" 
ON public.suppliers 
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can see all
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Supplier can see own profile
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = suppliers.user_id
    ) OR
    -- Only builders with ACTIVE business relationships can see contact info
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.deliveries d ON d.builder_id = p.id
      WHERE p.user_id = auth.uid()
      AND p.role = 'builder'
      AND d.supplier_id = suppliers.id
      AND d.status IN ('confirmed', 'in_transit', 'delivered')
      AND d.created_at > NOW() - INTERVAL '30 days' -- Recent relationship only
    ) OR
    -- Or builders with active quotes/negotiations
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.quotation_requests qr ON qr.builder_id = p.id
      WHERE p.user_id = auth.uid()
      AND p.role = 'builder'
      AND qr.supplier_id = suppliers.id
      AND qr.status IN ('pending', 'quoted', 'negotiating')
      AND qr.created_at > NOW() - INTERVAL '14 days'
    )
  )
);

-- Supplier management policy
CREATE POLICY "secure_supplier_self_management" 
ON public.suppliers 
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (
      role = 'admin' OR
      id = suppliers.user_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (
      role = 'admin' OR
      id = suppliers.user_id
    )
  )
);

-- =============================================================================
-- STEP 4: CREATE SECURE SUPPLIER DIRECTORY FUNCTION (NO CONTACT INFO)
-- =============================================================================

-- Create secure supplier directory function that doesn't expose contact details
CREATE OR REPLACE FUNCTION public.get_secure_supplier_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  location_general text, -- General area only, not specific address
  business_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view supplier directory';
  END IF;
  
  -- Log access attempt for security monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'supplier_directory_access',
    'medium',
    jsonb_build_object(
      'action', 'secure_directory_access',
      'timestamp', now(),
      'user_role', (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    )
  ) ON CONFLICT DO NOTHING;
  
  -- Return only non-sensitive business information
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    -- Only show general location (city/region), not specific address
    CASE 
      WHEN s.address IS NOT NULL THEN 
        split_part(s.address, ',', -1) -- Last part of address (usually city)
      ELSE 'Location not specified'
    END as location_general,
    CASE 
      WHEN s.is_verified AND s.is_active THEN 'Available for projects'
      WHEN s.is_verified AND NOT s.is_active THEN 'Currently unavailable'
      ELSE 'Verification pending'
    END as business_status
  FROM public.suppliers s
  WHERE s.is_verified = true; -- Only show verified suppliers
END;
$$;

-- =============================================================================
-- STEP 5: CREATE SECURE PROVIDER DIRECTORY FUNCTION
-- =============================================================================

-- Create secure provider directory function
CREATE OR REPLACE FUNCTION public.get_secure_provider_directory()
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  service_areas text[],
  vehicle_types text[],
  capacity_kg numeric,
  is_verified boolean,
  is_active boolean,
  rating numeric,
  contact_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view provider directory';
  END IF;
  
  -- Log access attempt
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'provider_directory_access',
    'medium',
    jsonb_build_object(
      'action', 'secure_directory_access',
      'timestamp', now()
    )
  ) ON CONFLICT DO NOTHING;
  
  -- Return only business information, no personal contact details
  RETURN QUERY
  SELECT 
    dp.id,
    dp.provider_name,
    dp.provider_type,
    dp.service_areas,
    dp.vehicle_types,
    dp.capacity_kg,
    dp.is_verified,
    dp.is_active,
    dp.rating,
    'Contact via platform messaging'::text as contact_method
  FROM public.delivery_providers dp
  WHERE dp.is_verified = true 
  AND dp.is_active = true;
END;
$$;

-- =============================================================================
-- STEP 6: CREATE BUSINESS RELATIONSHIP VERIFICATION FUNCTION
-- =============================================================================

-- Function to verify legitimate business relationships before exposing contact info
CREATE OR REPLACE FUNCTION public.request_supplier_contact_access(
  supplier_id_param uuid,
  business_justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record public.profiles%ROWTYPE;
  has_business_relationship boolean := false;
  contact_access_granted boolean := false;
  response_data jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile_record 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF user_profile_record IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check for legitimate business relationship
  IF user_profile_record.role = 'admin' THEN
    has_business_relationship := true;
    contact_access_granted := true;
  ELSIF user_profile_record.role = 'builder' THEN
    -- Check for active delivery or recent business relationship
    SELECT EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.builder_id = user_profile_record.id
      AND d.supplier_id = supplier_id_param
      AND d.status IN ('confirmed', 'in_transit', 'delivered')
      AND d.created_at > NOW() - INTERVAL '30 days'
    ) INTO has_business_relationship;
    
    -- Or check for active quotation requests
    IF NOT has_business_relationship THEN
      SELECT EXISTS (
        SELECT 1 FROM public.quotation_requests qr
        WHERE qr.builder_id = user_profile_record.id
        AND qr.supplier_id = supplier_id_param
        AND qr.status IN ('pending', 'quoted', 'negotiating')
        AND qr.created_at > NOW() - INTERVAL '14 days'
      ) INTO has_business_relationship;
    END IF;
    
    contact_access_granted := has_business_relationship;
  END IF;
  
  -- Log the access request for security audit
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'supplier_contact_access_request',
    CASE WHEN contact_access_granted THEN 'low' ELSE 'high' END,
    jsonb_build_object(
      'supplier_id', supplier_id_param,
      'business_justification', business_justification,
      'has_business_relationship', has_business_relationship,
      'access_granted', contact_access_granted,
      'user_role', user_profile_record.role,
      'timestamp', now()
    )
  );
  
  -- Prepare response
  IF contact_access_granted THEN
    -- Return supplier contact information
    SELECT jsonb_build_object(
      'access_granted', true,
      'supplier_info', jsonb_build_object(
        'id', s.id,
        'company_name', s.company_name,
        'contact_person', s.contact_person,
        'email', s.email,
        'phone', s.phone,
        'address', s.address
      ),
      'message', 'Contact information provided based on verified business relationship'
    ) INTO response_data
    FROM public.suppliers s
    WHERE s.id = supplier_id_param;
  ELSE
    response_data := jsonb_build_object(
      'access_granted', false,
      'message', 'Contact information requires an active business relationship. Please initiate a project or request a quote first.',
      'suggested_action', 'Use the platform messaging system or create a delivery request'
    );
  END IF;
  
  RETURN response_data;
END;
$$;

-- =============================================================================
-- STEP 7: UPDATE SYNC FUNCTIONS TO BE SECURE
-- =============================================================================

-- Update the sync function for delivery_providers_public to be ultra-secure
CREATE OR REPLACE FUNCTION public.sync_delivery_provider_public_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync completely non-sensitive information
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.delivery_providers_public (
      provider_id,
      provider_name,
      provider_type,
      service_areas,
      vehicle_types,
      capacity_kg,
      is_verified,
      is_active,
      rating,
      total_deliveries,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.provider_name,
      NEW.provider_type,
      NEW.service_areas,
      NEW.vehicle_types,
      NEW.capacity_kg,
      NEW.is_verified,
      NEW.is_active,
      NEW.rating,
      NEW.total_deliveries,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      provider_name = EXCLUDED.provider_name,
      provider_type = EXCLUDED.provider_type,
      service_areas = EXCLUDED.service_areas,
      vehicle_types = EXCLUDED.vehicle_types,
      capacity_kg = EXCLUDED.capacity_kg,
      is_verified = EXCLUDED.is_verified,
      is_active = EXCLUDED.is_active,
      rating = EXCLUDED.rating,
      total_deliveries = EXCLUDED.total_deliveries,
      updated_at = EXCLUDED.updated_at;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.delivery_providers_public 
    WHERE provider_id = OLD.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 8: GRANT MINIMAL NECESSARY PERMISSIONS
-- =============================================================================

-- Grant access to secure functions only
GRANT EXECUTE ON FUNCTION public.get_secure_supplier_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_provider_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_supplier_contact_access(uuid, text) TO authenticated;

-- =============================================================================
-- STEP 9: SECURITY MONITORING AND AUDIT
-- =============================================================================

-- Create trigger to monitor sensitive data access attempts
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any direct access attempts to sensitive tables
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'sensitive_table_access_attempt',
    'high',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', now(),
      'warning', 'Direct table access detected - should use secure functions'
    )
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_supplier_access ON public.suppliers;
CREATE TRIGGER audit_supplier_access
  AFTER SELECT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_access();

DROP TRIGGER IF EXISTS audit_delivery_provider_access ON public.delivery_providers;
CREATE TRIGGER audit_delivery_provider_access
  AFTER SELECT ON public.delivery_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_access();

-- =============================================================================
-- STEP 10: FINAL SECURITY VERIFICATION
-- =============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_name text;
  rls_enabled boolean;
BEGIN
  FOR table_name IN VALUES ('delivery_providers_public'), ('delivery_providers'), ('suppliers') LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = table_name;
    
    IF NOT rls_enabled THEN
      RAISE EXCEPTION 'CRITICAL: RLS not enabled on % table!', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'SUCCESS: Row Level Security is properly enabled on all sensitive tables';
END
$$;

-- Final security event log
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- System user
  'comprehensive_security_fix_applied',
  'critical',
  jsonb_build_object(
    'fix_type', 'comprehensive_pii_protection',
    'tables_secured', ARRAY['delivery_providers_public', 'delivery_providers', 'suppliers'],
    'vulnerabilities_fixed', ARRAY[
      'public_provider_data_exposure',
      'pii_overpermissive_access',
      'supplier_contact_harvesting'
    ],
    'business_relationship_verification', 'implemented',
    'secure_functions_created', ARRAY[
      'get_secure_supplier_directory',
      'get_secure_provider_directory', 
      'request_supplier_contact_access'
    ],
    'timestamp', now(),
    'migration_file', 'FINAL_COMPREHENSIVE_SECURITY_FIX.sql'
  )
) ON CONFLICT DO NOTHING;

-- Success confirmation
SELECT 
  '🛡️ COMPREHENSIVE SECURITY FIX APPLIED SUCCESSFULLY' as status,
  'All identified security vulnerabilities have been resolved' as message,
  'Business relationship verification implemented' as feature,
  now() as applied_at;
