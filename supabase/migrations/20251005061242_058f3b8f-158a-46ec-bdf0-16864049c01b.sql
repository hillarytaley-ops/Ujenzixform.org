-- ========================================
-- FINAL SECURITY HARDENING
-- ========================================

-- 1. DELIVERY NOTES RLS
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "delivery_notes_admin_access" ON public.delivery_notes;
  DROP POLICY IF EXISTS "delivery_notes_buyer_view" ON public.delivery_notes;
  DROP POLICY IF EXISTS "delivery_notes_supplier_view" ON public.delivery_notes;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "delivery_notes_admin_access"
ON public.delivery_notes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

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

-- 2. PROFILES_BUSINESS_DIRECTORY
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
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

-- 3. PROJECTS_SAFE
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
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN pr.location
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = pr.builder_id
    ) THEN pr.location
    ELSE 'Location protected'
  END as location,
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

-- 4. SUPPLIERS_PUBLIC_DIRECTORY
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

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
  'Contact via secure platform' as contact_status
FROM suppliers s
WHERE s.is_verified = true;

GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Log completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'all_security_fixes_applied',
  'high',
  jsonb_build_object(
    'delivery_notes', 'RLS enabled with buyer and supplier policies',
    'profiles_business_directory', 'Masked registration and license data',
    'projects_safe', 'Protected location and access_code fields',
    'suppliers_public_directory', 'Auth-only access with contact protection',
    'timestamp', NOW()
  )
);