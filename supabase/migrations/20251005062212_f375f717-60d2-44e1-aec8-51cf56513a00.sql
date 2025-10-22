-- ========================================
-- SECURITY FIX: VIEWS AND UNDERLYING TABLES
-- ========================================

-- 1. FIX PROFILES TABLE RLS (underlying profiles_business_directory)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_business" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "profiles_read_own"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_read_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users with verified business relationships can read business profiles
CREATE POLICY "profiles_read_business"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_professional = true 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
    OR has_verified_business_relationship_with_profile(profiles.id)
  )
);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update all profiles
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. RECREATE DELIVERIES_SAFE VIEW with security_invoker
DROP VIEW IF EXISTS public.deliveries_safe CASCADE;

CREATE VIEW public.deliveries_safe
WITH (security_invoker = true) AS
SELECT 
  d.id,
  d.tracking_number,
  d.material_type,
  d.quantity,
  d.weight_kg,
  d.pickup_address,
  d.delivery_address,
  d.status,
  d.pickup_date,
  d.delivery_date,
  d.estimated_delivery_time,
  d.actual_delivery_time,
  d.vehicle_details,
  d.notes,
  d.supplier_id,
  d.builder_id,
  d.project_id,
  d.created_at,
  d.updated_at,
  -- Mask driver contact info based on access level
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_name
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = d.builder_id
    ) THEN d.driver_name
    ELSE 'Driver assigned - contact via platform'
  END as driver_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_phone
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.id = d.builder_id
    ) AND d.status IN ('in_progress', 'out_for_delivery', 'delivered') THEN d.driver_phone
    ELSE 'Contact protected - use platform messaging'
  END as driver_phone
FROM deliveries d;

-- Grant access only to authenticated users
GRANT SELECT ON public.deliveries_safe TO authenticated;
REVOKE SELECT ON public.deliveries_safe FROM anon;

-- 3. UPDATE PROFILES_BUSINESS_DIRECTORY with stronger auth requirements
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
REVOKE SELECT ON public.profiles_business_directory FROM anon;

-- 4. Log security fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'view_security_hardening_applied',
  'critical',
  jsonb_build_object(
    'deliveries_safe', 'View recreated with security_invoker and driver contact masking',
    'profiles', 'RLS policies applied with role-based access control',
    'profiles_business_directory', 'View secured with auth-only access and data masking',
    'access_control', 'All views now require authentication',
    'timestamp', NOW()
  )
);