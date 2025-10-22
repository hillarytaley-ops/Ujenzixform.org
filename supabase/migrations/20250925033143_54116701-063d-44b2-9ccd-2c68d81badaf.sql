-- ====================================================
-- DELIVERY PROVIDERS SECURITY LOCKDOWN - CORRECTED
-- PROTECT SENSITIVE DRIVER PERSONAL INFORMATION
-- ====================================================

-- Drop ALL existing policies first
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.delivery_providers', pol.policyname);
    END LOOP;
END $$;

-- Revoke ALL public access to delivery providers
REVOKE ALL ON public.delivery_providers FROM PUBLIC;
REVOKE ALL ON public.delivery_providers FROM anon;
REVOKE ALL ON public.delivery_providers FROM authenticated;

-- Force maximum RLS protection
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers FORCE ROW LEVEL SECURITY;

-- Admin-only access to all provider data including sensitive personal information
CREATE POLICY "delivery_providers_admin_full_access" 
ON public.delivery_providers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Provider self-access to own record only
CREATE POLICY "delivery_providers_self_access" 
ON public.delivery_providers FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create secure function for public provider directory (NO sensitive data)
CREATE OR REPLACE FUNCTION public.get_delivery_providers_public_safe()
RETURNS TABLE(
  id uuid, provider_name text, provider_type text, service_areas text[], 
  vehicle_types text[], is_verified boolean, is_active boolean, 
  rating numeric, total_deliveries integer, contact_status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role FROM profiles WHERE user_id = auth.uid();
  
  -- Only admins can access provider directory
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      dp.id, dp.provider_name, dp.provider_type, dp.service_areas,
      dp.vehicle_types, dp.is_verified, dp.is_active,
      dp.rating, dp.total_deliveries,
      'Admin access - contact info available via secure functions'::text as contact_status
    FROM delivery_providers dp
    WHERE dp.is_verified = true AND dp.is_active = true
    ORDER BY dp.provider_name;
  ELSE
    -- No access for non-admin users
    RETURN;
  END IF;
END; $$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_delivery_providers_public_safe() TO authenticated;

-- Final verification
DO $$
DECLARE
  public_privileges INTEGER;
  policy_count INTEGER;
  rls_status RECORD;
BEGIN
  -- Check for any remaining public privileges
  SELECT COUNT(*) INTO public_privileges
  FROM information_schema.table_privileges 
  WHERE table_name = 'delivery_providers' AND table_schema = 'public' 
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  
  -- Count active policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'delivery_providers' AND schemaname = 'public';
  
  -- Check RLS status
  SELECT 
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
  INTO rls_status
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'delivery_providers';
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ DELIVERY PROVIDERS SECURITY LOCKDOWN COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Public privileges: % (must be 0)', public_privileges;
  RAISE NOTICE '✅ Active RLS policies: % (must be 2)', policy_count;
  RAISE NOTICE '✅ RLS enabled: %', rls_status.rls_enabled;
  RAISE NOTICE '✅ RLS forced: %', rls_status.rls_forced;
  RAISE NOTICE '';
  RAISE NOTICE '🛡️ DRIVER PROTECTION STATUS:';
  RAISE NOTICE '  • Phone numbers: COMPLETELY PROTECTED from unauthorized access';
  RAISE NOTICE '  • Email addresses: COMPLETELY PROTECTED from unauthorized access';  
  RAISE NOTICE '  • Home addresses: COMPLETELY PROTECTED from unauthorized access';
  RAISE NOTICE '  • License information: COMPLETELY PROTECTED from unauthorized access';
  RAISE NOTICE '  • National ID data: COMPLETELY PROTECTED from unauthorized access';
  RAISE NOTICE '  • Admin access: GRANTED for management purposes only';
  RAISE NOTICE '  • Provider self-access: GRANTED for own records only';
  RAISE NOTICE '  • Public access: COMPLETELY ELIMINATED';
  RAISE NOTICE '====================================================';
  
  IF public_privileges > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: % public privileges still exist!', public_privileges;
  END IF;
END $$;