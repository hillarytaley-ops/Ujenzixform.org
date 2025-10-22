-- ========================================
-- SECURITY HARDENING - DELIVERY NOTES, PROFILES, PROJECTS
-- ========================================

-- 1. DELIVERY NOTES - Enable RLS and restrict access
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

-- 2. PROFILES_BUSINESS_DIRECTORY - Mask sensitive registration data
DROP VIEW IF EXISTS public.profiles_business_directory;

CREATE VIEW public.profiles_business_directory
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  p.role,
  p.is_professional,
  p.user_type,
  p.created_at,
  -- Mask company_registration
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.company_registration
    WHEN p.user_id = auth.uid() THEN p.company_registration
    WHEN has_verified_business_relationship_with_profile(p.id) THEN p.company_registration
    ELSE '***PROTECTED***'
  END as company_registration,
  -- Mask business_license
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.business_license
    WHEN p.user_id = auth.uid() THEN p.business_license
    WHEN has_verified_business_relationship_with_profile(p.id) THEN p.business_license
    ELSE '***PROTECTED***'
  END as business_license
FROM profiles p
WHERE p.is_professional = true 
  AND p.role IN ('builder', 'supplier');

GRANT SELECT ON public.profiles_business_directory TO authenticated;

-- 3. PROJECTS_SAFE - Protect location and access_code
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
  -- Protect location field
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN pr.location
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = pr.builder_id
    ) THEN pr.location
    WHEN EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.project_id = pr.id
      AND d.status IN ('in_progress', 'out_for_delivery')
      AND EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.user_id = auth.uid()
      )
    ) THEN 'General area - contact builder for exact location'
    ELSE 'Location protected - verified business relationship required'
  END as location,
  -- Protect access_code field
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

-- 4. SUPPLIERS_PUBLIC_DIRECTORY - Require authentication
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
  -- Show contact access status
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'Full access'
    WHEN EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN profiles p ON p.id = po.buyer_id
      WHERE po.supplier_id = s.id
      AND p.user_id = auth.uid()
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > NOW() - INTERVAL '90 days'
    ) THEN 'Contact available'
    ELSE 'Request via platform'
  END as contact_status
FROM suppliers s
WHERE s.is_verified = true;

GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- 5. GPS COORDINATES - Only accepted providers
DROP POLICY IF EXISTS "delivery_requests_provider_read" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_exact_location" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_accepted_only" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_accepted_gps" ON public.delivery_requests;

CREATE POLICY "delivery_requests_accepted_provider_gps"
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

-- Log security completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'security_hardening_complete',
  'high',
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'delivery_notes_rls_enabled',
      'profiles_business_directory_masked',
      'projects_location_protected',
      'projects_access_code_restricted',
      'suppliers_directory_auth_required',
      'gps_accepted_providers_only'
    ],
    'timestamp', NOW()
  )
);