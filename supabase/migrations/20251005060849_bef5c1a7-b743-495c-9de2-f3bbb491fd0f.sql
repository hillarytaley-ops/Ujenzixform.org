-- ========================================
-- TARGETED SECURITY FIXES - FINAL CORRECTED VERSION
-- ========================================

-- 1. DELIVERY NOTES - Add comprehensive RLS
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_notes_admin_access" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_buyer_view" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_supplier_view" ON public.delivery_notes;

CREATE POLICY "delivery_notes_admin_access"
ON public.delivery_notes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "delivery_notes_buyer_view"
ON public.delivery_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.id = delivery_notes.purchase_order_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "delivery_notes_supplier_view"
ON public.delivery_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = delivery_notes.supplier_id
    AND s.user_id = auth.uid()
  )
);

-- 2. PROFILES_BUSINESS_DIRECTORY VIEW - Mask business registration data
DROP VIEW IF EXISTS public.profiles_business_directory;

CREATE VIEW public.profiles_business_directory
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  -- Mask sensitive business registration data
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.company_registration
    WHEN p.user_id = auth.uid() THEN p.company_registration
    WHEN has_verified_business_relationship_with_profile(p.id) THEN p.company_registration
    ELSE '***PROTECTED***'
  END as company_registration,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.business_license
    WHEN p.user_id = auth.uid() THEN p.business_license
    WHEN has_verified_business_relationship_with_profile(p.id) THEN p.business_license
    ELSE '***PROTECTED***'
  END as business_license,
  p.role,
  p.is_professional,
  p.user_type,
  p.created_at
FROM profiles p
WHERE p.is_professional = true 
  AND p.role IN ('builder', 'supplier');

GRANT SELECT ON public.profiles_business_directory TO authenticated;

-- 3. PROJECTS_SAFE VIEW - Protect location and access_code
CREATE OR REPLACE VIEW public.projects_safe
WITH (security_invoker = true) AS
SELECT 
  pr.id,
  pr.name,
  pr.description,
  pr.start_date,
  pr.end_date,
  pr.status,
  pr.builder_id,
  pr.created_at,
  pr.updated_at,
  -- Mask location based on role and active delivery relationship
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN pr.location
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = pr.builder_id
    ) THEN pr.location
    WHEN EXISTS (
      SELECT 1 FROM deliveries d
      JOIN delivery_providers dp ON dp.user_id = auth.uid()
      WHERE d.project_id = pr.id
      AND d.status IN ('in_progress', 'out_for_delivery')
    ) THEN 'General area - contact builder for details'
    ELSE 'Location protected'
  END as location,
  -- Only show access_code to project owner and admin
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN pr.access_code
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = pr.builder_id
    ) THEN pr.access_code
    ELSE NULL
  END as access_code
FROM projects pr;

GRANT SELECT ON public.projects_safe TO authenticated;

-- 4. SUPPLIERS_PUBLIC_DIRECTORY VIEW - Auth required
DROP VIEW IF EXISTS public.suppliers_public_directory;

CREATE VIEW public.suppliers_public_directory
WITH (security_invoker = true) AS
SELECT 
  s.id,
  s.company_name,
  s.rating,
  s.is_verified,
  s.materials_offered,
  s.specialties,
  s.created_at,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'Admin access available'
    WHEN EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN profiles p ON p.id = po.buyer_id
      WHERE po.supplier_id = s.id
      AND p.user_id = auth.uid()
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > NOW() - INTERVAL '90 days'
    ) THEN 'Contact available - verified relationship'
    ELSE 'Contact via platform - business verification required'
  END as contact_status
FROM suppliers s
WHERE s.is_verified = true;

GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- 5. GPS COORDINATES - Only accepted providers
DROP POLICY IF EXISTS "delivery_requests_provider_read" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_exact_location" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_exact_location"
ON public.delivery_requests FOR SELECT
TO authenticated
USING (
  provider_id IS NOT NULL 
  AND status = 'accepted'
  AND EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.id = delivery_requests.provider_id 
    AND dp.user_id = auth.uid()
  )
);

-- 6. PROFILES - Auth required for directory
DROP POLICY IF EXISTS "profiles_public_directory_read" ON public.profiles;

CREATE POLICY "profiles_authenticated_directory_read"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (role IN ('builder', 'supplier') AND is_professional = true)
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Log completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'targeted_security_complete',
  'high',
  jsonb_build_object(
    'description', 'Completed targeted security fixes for delivery notes, profiles, and projects',
    'secured_areas', ARRAY[
      'delivery_notes_rls_policies',
      'profiles_business_data_masking',
      'projects_location_access_protection',
      'suppliers_auth_required',
      'gps_accepted_providers_only'
    ],
    'timestamp', NOW()
  )
);