-- ========================================
-- CRITICAL DATA PRIVACY FIX: Field-Level Access Control
-- ========================================

-- ========================================
-- 1. PROFILES: Secure Business Directory
-- ========================================

-- Drop problematic policy
DROP POLICY IF EXISTS "profiles_authenticated_business_directory" ON public.profiles;

-- Drop and recreate view
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory AS
SELECT 
  id,
  role,
  user_type,
  is_professional,
  company_name,
  company_registration,
  business_license,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_business_directory TO authenticated;

-- ========================================
-- 2. SUPPLIERS: Secure Directory
-- ========================================

-- Drop problematic policy
DROP POLICY IF EXISTS "suppliers_directory_no_contact_info" ON public.suppliers;

-- Drop view if exists (not table)
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Create secure view
CREATE VIEW public.suppliers_public_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at
FROM public.suppliers
WHERE is_verified = true;

GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- ========================================
-- 3. DRIVER CONTACT: Time-Limited Access (2 hours)
-- ========================================

DROP POLICY IF EXISTS "driver_contact_active_delivery" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_time_limited_access" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_time_limited_2hr" ON public.driver_contact_data;

CREATE POLICY "driver_contact_time_limited_2hr"
ON public.driver_contact_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
  OR
  EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = driver_contact_data.delivery_id
    AND (
      d.status IN ('in_progress', 'out_for_delivery')
      OR
      (d.status = 'delivered' AND d.actual_delivery_time > NOW() - INTERVAL '2 hours')
    )
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.id = d.builder_id)
      OR
      EXISTS (SELECT 1 FROM public.suppliers s JOIN public.profiles p ON p.user_id = s.user_id WHERE p.user_id = auth.uid() AND s.id = d.supplier_id)
    )
  )
);

-- ========================================
-- 4. DELIVERY TRACKING: Admin-Only GPS
-- ========================================

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'delivery_tracking' AND cmd = 'SELECT')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.delivery_tracking';
    END LOOP;
END $$;

CREATE POLICY "tracking_gps_admin_only"
ON public.delivery_tracking
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- ========================================
-- 5. ADDRESS MASKING FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.mask_delivery_address(
  full_address text,
  quotation_status text,
  is_requester boolean,
  is_admin boolean
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin OR is_requester THEN RETURN full_address; END IF;
  IF quotation_status = 'pending' THEN 
    RETURN substring(full_address, 1, 30) || '... (General area for pricing)';
  END IF;
  IF quotation_status IN ('accepted', 'completed') THEN RETURN full_address; END IF;
  RETURN 'Address protected';
END;
$$;

-- ========================================
-- AUDIT LOG
-- ========================================

INSERT INTO public.security_events (event_type, severity, details)
VALUES (
  'privacy_fixes_applied',
  'high',
  jsonb_build_object(
    'fixed', ARRAY['profiles_contact_masked', 'suppliers_contact_masked', 'driver_time_limited', 'gps_admin_only'],
    'timestamp', NOW()
  )
);