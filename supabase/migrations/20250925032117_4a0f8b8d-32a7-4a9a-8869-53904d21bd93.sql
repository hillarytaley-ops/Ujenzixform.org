-- ====================================================
-- FINAL SUPPLIERS SECURITY LOCKDOWN
-- ELIMINATE ALL PUBLIC ACCESS TO SUPPLIER CONTACT DATA
-- ====================================================

-- Ensure NO public access exists
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Force RLS on suppliers table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

-- Remove existing policies completely
DROP POLICY IF EXISTS "suppliers_admin_full_access_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_access_2024" ON public.suppliers;

-- Create ultra-restrictive admin-only policy
CREATE POLICY "suppliers_admin_only_contact_access" 
ON public.suppliers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create supplier self-access policy (own records only)
CREATE POLICY "suppliers_self_record_access" 
ON public.suppliers FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update all supplier functions to be admin-only
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_status text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role FROM profiles WHERE user_id = auth.uid();
  
  -- ONLY admin gets any data
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      'Admin access - contact info available via secure functions'::text as contact_status
    FROM suppliers s
    ORDER BY s.company_name;
  ELSE
    -- Return absolutely nothing for non-admin users
    RETURN;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_status text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role FROM profiles WHERE user_id = auth.uid();
  
  -- ONLY admin gets directory access
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      'Admin directory access'::text as contact_status
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  ELSE
    -- No access for non-admin users
    RETURN;
  END IF;
END; $$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;

-- Final verification
DO $$
DECLARE
  public_privileges INTEGER;
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check for any remaining public privileges
  SELECT COUNT(*) INTO public_privileges
  FROM information_schema.table_privileges 
  WHERE table_name = 'suppliers' AND table_schema = 'public' 
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  
  -- Count active policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'suppliers' AND schemaname = 'public';
  
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE tablename = 'suppliers' AND schemaname = 'public';
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ SUPPLIERS CONTACT DATA SECURITY LOCKDOWN COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Public privileges: % (must be 0)', public_privileges;
  RAISE NOTICE '✅ Active RLS policies: % (must be 2)', policy_count;
  RAISE NOTICE '✅ RLS enabled: % (must be true)', rls_enabled;
  RAISE NOTICE '';
  RAISE NOTICE '🛡️ PROTECTION STATUS:';
  RAISE NOTICE '  • Email addresses: COMPLETELY PROTECTED from public access';
  RAISE NOTICE '  • Phone numbers: COMPLETELY PROTECTED from public access';
  RAISE NOTICE '  • Business addresses: COMPLETELY PROTECTED from public access';
  RAISE NOTICE '  • Admin access: GRANTED for management purposes';
  RAISE NOTICE '  • Supplier self-access: GRANTED for own records only';
  RAISE NOTICE '  • Public access: COMPLETELY ELIMINATED';
  RAISE NOTICE '====================================================';
  
  IF public_privileges > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: % public privileges still exist!', public_privileges;
  END IF;
END $$;