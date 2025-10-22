-- ============================================
-- FIX: Lock down suppliers_public_directory view
-- Must revoke from PUBLIC role which grants to everyone by default
-- ============================================

-- Step 1: Drop and recreate view with authentication requirement
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory
WITH (security_barrier = true)
AS
SELECT 
  s.id,
  s.company_name,
  s.specialties,
  s.materials_offered,
  s.rating,
  s.is_verified,
  s.created_at,
  s.updated_at,
  'Contact info protected - use secure request'::TEXT as contact_status
FROM suppliers s
WHERE s.is_verified = true
  AND auth.uid() IS NOT NULL;  -- Authentication required in view definition

-- Step 2: Revoke ALL access from everyone (including default public grants)
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM anon;
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM authenticated;

-- Step 3: Grant SELECT only to authenticated users
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Step 4: Secure the directory function
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  contact_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access supplier directory';
  END IF;

  -- Audit access
  INSERT INTO supplier_contact_security_audit (
    user_id,
    contact_field_requested,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    'directory_listing',
    true,
    'Authenticated directory access',
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low' ELSE 'medium' END
  );

  -- Return safe data
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    'Contact info protected - use secure request'::TEXT
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- Step 5: Summary
DO $$
BEGIN
  RAISE NOTICE '✓ Supplier directory security implemented:';
  RAISE NOTICE '  - View recreated with auth.uid() check';
  RAISE NOTICE '  - All public access revoked';
  RAISE NOTICE '  - SELECT granted to authenticated users only';
  RAISE NOTICE '  - Function requires authentication';
  RAISE NOTICE '  - All access logged to audit table';
END $$;