-- ============================================
-- FIX: Completely block anonymous access to suppliers_public_directory
-- The view will only be accessible via the secure function
-- ============================================

-- Step 1: Drop the view and recreate without any public exposure
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Step 2: Create a completely locked-down view (no direct access)
-- This view will ONLY be accessible through the secure function
CREATE VIEW public.suppliers_public_directory
WITH (security_invoker = on, security_barrier = true)
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
WHERE s.is_verified = true;

-- Step 3: Revoke ALL access (including default PUBLIC access)
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM anon;
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM authenticated;

-- Step 4: Grant access ONLY to service_role (for the secure function to use)
-- This ensures the view can ONLY be accessed through our secure function
GRANT SELECT ON public.suppliers_public_directory TO service_role;

-- Step 5: Update the secure function to be the ONLY way to access supplier directory
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
  -- Strictly require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access supplier directory';
  END IF;
  
  -- Additional role check - only allow specific roles
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'builder'::app_role) OR
    has_role(auth.uid(), 'supplier'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access supplier directory';
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
    'Authenticated user with valid role accessed supplier directory',
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low' ELSE 'medium' END
  );

  -- Return safe directory data (view is only accessible by this function)
  RETURN QUERY
  SELECT 
    spd.id,
    spd.company_name,
    spd.specialties,
    spd.materials_offered,
    spd.rating,
    spd.is_verified,
    spd.created_at,
    spd.updated_at,
    spd.contact_status
  FROM suppliers_public_directory spd
  ORDER BY spd.company_name;
END;
$$;

-- Step 6: Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_suppliers_directory_safe() TO authenticated;

-- Step 7: Verification
DO $$
DECLARE
  view_exists BOOLEAN;
  anon_can_access BOOLEAN;
  auth_can_access BOOLEAN;
  public_can_access BOOLEAN;
BEGIN
  -- Check view exists
  SELECT EXISTS(
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'suppliers_public_directory'
  ) INTO view_exists;
  
  -- Check if anon has access
  SELECT EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name = 'suppliers_public_directory'
    AND grantee = 'anon'
  ) INTO anon_can_access;
  
  -- Check if authenticated has direct access
  SELECT EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name = 'suppliers_public_directory'
    AND grantee = 'authenticated'
  ) INTO auth_can_access;
  
  -- Check if PUBLIC has access
  SELECT EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name = 'suppliers_public_directory'
    AND grantee = 'PUBLIC'
  ) INTO public_can_access;
  
  -- Verify
  IF NOT view_exists THEN
    RAISE EXCEPTION 'suppliers_public_directory view does not exist';
  END IF;
  
  IF anon_can_access THEN
    RAISE EXCEPTION 'SECURITY FAILURE: anon can still access supplier directory';
  END IF;
  
  IF auth_can_access THEN
    RAISE EXCEPTION 'SECURITY FAILURE: authenticated users have direct access to view';
  END IF;
  
  IF public_can_access THEN
    RAISE EXCEPTION 'SECURITY FAILURE: PUBLIC has access to view';
  END IF;
  
  RAISE NOTICE '✓ Supplier directory completely secured:';
  RAISE NOTICE '  - View exists: %', view_exists;
  RAISE NOTICE '  - Anonymous access: BLOCKED';
  RAISE NOTICE '  - Direct authenticated access: BLOCKED';
  RAISE NOTICE '  - PUBLIC access: BLOCKED';
  RAISE NOTICE '  - Access method: FUNCTION ONLY';
  RAISE NOTICE '  - Function requires: Authentication + Role check';
  RAISE NOTICE '  - All access logged to audit table';
END $$;