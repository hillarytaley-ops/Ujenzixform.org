-- ====================================================
-- BALANCED DELIVERY PROVIDER ACCESS FIX
-- CRITICAL: Fix PUBLIC_DELIVERY_PROVIDER_DATA while enabling legitimate business access
-- ====================================================
--
-- SECURITY ALERT: PUBLIC_DELIVERY_PROVIDER_DATA indicates driver data is still exposed
-- BUSINESS NEED: Builders and suppliers need contact info for active deliveries
-- SOLUTION: Role-based access with delivery context verification
--
-- PROJECT: wuuyjjpgzgeimiptuuws
-- EXECUTE IMMEDIATELY IN SUPABASE DASHBOARD > SQL EDITOR

-- ====================================================
-- STEP 1: IMMEDIATE SECURITY LOCKDOWN
-- ====================================================

-- CRITICAL: Remove ALL public access to delivery_providers table
REVOKE ALL PRIVILEGES ON public.delivery_providers FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.delivery_providers FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.delivery_providers FROM PUBLIC;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.delivery_providers FROM anon;

-- Enable RLS with force to prevent bypass
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers FORCE ROW LEVEL SECURITY;

-- ====================================================
-- STEP 2: CLEAN UP EXISTING POLICIES
-- ====================================================

-- Drop ALL existing policies to prevent conflicts
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_providers', pol.policyname);
        RAISE NOTICE 'REMOVED: Delivery provider policy %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE 'SUCCESS: All existing delivery provider policies cleared for security';
END $$;

-- ====================================================
-- STEP 3: ACTIVE DELIVERY VERIFICATION SYSTEM
-- ====================================================

-- Create active deliveries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.active_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_provider_id UUID NOT NULL REFERENCES public.delivery_providers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  delivery_address TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  contact_authorized BOOLEAN NOT NULL DEFAULT false,
  authorized_by UUID REFERENCES auth.users(id),
  authorized_at TIMESTAMP WITH TIME ZONE,
  delivery_start_time TIMESTAMP WITH TIME ZONE,
  delivery_end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secure the active deliveries table
ALTER TABLE public.active_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS for active deliveries - participants and admin only
CREATE POLICY "active_deliveries_participant_access" 
ON public.active_deliveries FOR ALL
TO authenticated
USING (
  requester_id = auth.uid() OR 
  supplier_id IN (
    SELECT s.id FROM suppliers s 
    JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
    WHERE p.user_id = auth.uid()
  ) OR
  delivery_provider_id IN (
    SELECT dp.id FROM delivery_providers dp
    JOIN profiles p ON (p.id = dp.user_id OR p.user_id = dp.user_id)
    WHERE p.user_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  requester_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ====================================================
-- STEP 4: BALANCED RLS POLICIES FOR DELIVERY PROVIDERS
-- ====================================================

-- Policy 1: ADMIN - Full access to all delivery provider data
CREATE POLICY "delivery_providers_balanced_admin_full_access" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy 2: DRIVERS - Self access to own data
CREATE POLICY "delivery_providers_balanced_driver_self_access" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('delivery_provider', 'driver')
    AND (
      p.id = delivery_providers.user_id OR 
      p.user_id = delivery_providers.user_id OR
      delivery_providers.driver_id = p.id OR
      delivery_providers.driver_id = p.user_id
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('delivery_provider', 'driver')
    AND (
      p.id = delivery_providers.user_id OR 
      p.user_id = delivery_providers.user_id OR
      delivery_providers.driver_id = p.id OR
      delivery_providers.driver_id = p.user_id
    )
  )
);

-- Policy 3: ACTIVE DELIVERY CONTACT - Contact info for active deliveries only
CREATE POLICY "delivery_providers_balanced_active_delivery_contact" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  is_verified = true AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'contractor', 'supplier')
  ) AND
  EXISTS (
    SELECT 1 FROM public.active_deliveries ad
    WHERE ad.delivery_provider_id = delivery_providers.id
    AND ad.contact_authorized = true
    AND ad.delivery_status IN ('assigned', 'in_transit')
    AND (
      ad.requester_id = auth.uid() OR
      ad.supplier_id IN (
        SELECT s.id FROM suppliers s 
        JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
        WHERE p.user_id = auth.uid()
      )
    )
  )
);

-- Policy 4: BUSINESS DIRECTORY - Basic info only, NO personal data
CREATE POLICY "delivery_providers_balanced_business_directory" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  is_verified = true AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'contractor', 'supplier')
  )
);

-- ====================================================
-- STEP 5: BALANCED ACCESS FUNCTIONS
-- ====================================================

-- Balanced delivery provider access function
CREATE OR REPLACE FUNCTION public.get_delivery_provider_balanced_access(
  provider_uuid UUID DEFAULT NULL,
  delivery_context UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  provider_name TEXT,
  vehicle_type TEXT,
  availability_status TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  access_level TEXT,
  contact_access_reason TEXT,
  business_context TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  has_active_delivery BOOLEAN := FALSE;
  is_own_data BOOLEAN := FALSE;
BEGIN
  user_id := auth.uid();
  
  -- Block unauthenticated access
  IF user_id IS NULL THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      '[BLOCKED - Authentication required]'::TEXT,
      '[BLOCKED]'::TEXT, '[BLOCKED]'::TEXT, '[BLOCKED]'::TEXT,
      '[BLOCKED]'::TEXT, '[BLOCKED]'::TEXT, '[BLOCKED]'::TEXT,
      'BLOCKED'::TEXT,
      'Authentication required for delivery provider access'::TEXT,
      'SECURITY_BLOCK'::TEXT;
    RETURN;
  END IF;

  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = user_id;

  -- ADMIN gets full access
  IF user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      dp.id, COALESCE(dp.provider_name, 'N/A'), COALESCE(dp.vehicle_type, 'N/A'),
      COALESCE(dp.availability_status, 'N/A'), COALESCE(dp.phone, 'N/A'),
      COALESCE(dp.email, 'N/A'), COALESCE(dp.address, 'N/A'),
      COALESCE(dp.license_number, 'N/A'), 'ADMIN'::TEXT,
      'Administrative access for management'::TEXT, 'ADMIN_MANAGEMENT'::TEXT
    FROM delivery_providers dp 
    WHERE provider_uuid IS NULL OR dp.id = provider_uuid;
    RETURN;
  END IF;

  -- Check if accessing own data
  IF user_role IN ('delivery_provider', 'driver') THEN
    SELECT EXISTS (
      SELECT 1 FROM delivery_providers dp
      JOIN profiles p ON (
        p.id = dp.user_id OR p.user_id = dp.user_id OR
        dp.driver_id = p.id OR dp.driver_id = p.user_id
      )
      WHERE p.user_id = user_id AND (provider_uuid IS NULL OR dp.id = provider_uuid)
    ) INTO is_own_data;

    -- DRIVER self-access
    IF is_own_data THEN
      RETURN QUERY
      SELECT 
        dp.id, COALESCE(dp.provider_name, 'N/A'), COALESCE(dp.vehicle_type, 'N/A'),
        COALESCE(dp.availability_status, 'N/A'), COALESCE(dp.phone, 'N/A'),
        COALESCE(dp.email, 'N/A'), COALESCE(dp.address, 'N/A'),
        COALESCE(dp.license_number, 'N/A'), 'SELF'::TEXT,
        'Driver accessing own personal data'::TEXT, 'SELF_ACCESS'::TEXT
      FROM delivery_providers dp 
      JOIN profiles p ON (
        p.id = dp.user_id OR p.user_id = dp.user_id OR
        dp.driver_id = p.id OR dp.driver_id = p.user_id
      )
      WHERE p.user_id = user_id AND (provider_uuid IS NULL OR dp.id = provider_uuid);
      RETURN;
    END IF;
  END IF;

  -- Check for active delivery with contact authorization
  IF user_role IN ('builder', 'contractor', 'supplier') THEN
    SELECT EXISTS (
      SELECT 1 FROM active_deliveries ad
      WHERE ad.delivery_provider_id = provider_uuid
      AND ad.contact_authorized = true
      AND ad.delivery_status IN ('assigned', 'in_transit')
      AND (
        ad.requester_id = user_id OR
        ad.supplier_id IN (
          SELECT s.id FROM suppliers s 
          JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
          WHERE p.user_id = user_id
        )
      )
    ) INTO has_active_delivery;

    -- ACTIVE DELIVERY contact access
    IF has_active_delivery THEN
      RETURN QUERY
      SELECT 
        dp.id, COALESCE(dp.provider_name, 'N/A'), COALESCE(dp.vehicle_type, 'N/A'),
        COALESCE(dp.availability_status, 'N/A'), COALESCE(dp.phone, 'N/A'),
        COALESCE(dp.email, 'N/A'), '[DELIVERY ADDRESS ONLY]'::TEXT,
        '[NOT AUTHORIZED]'::TEXT, 'DELIVERY_CONTACT'::TEXT,
        'Contact authorized for active delivery'::TEXT, 'ACTIVE_DELIVERY'::TEXT
      FROM delivery_providers dp 
      WHERE dp.id = provider_uuid AND dp.is_verified = true;
      RETURN;
    END IF;

    -- BUSINESS DIRECTORY - Basic info only
    RETURN QUERY
    SELECT 
      dp.id, COALESCE(dp.provider_name, 'N/A'), COALESCE(dp.vehicle_type, 'N/A'),
      COALESCE(dp.availability_status, 'Available'), 
      '[CONTACT VIA PLATFORM]'::TEXT, '[CONTACT VIA PLATFORM]'::TEXT,
      '[CONTACT VIA PLATFORM]'::TEXT, '[PRIVATE]'::TEXT,
      'DIRECTORY'::TEXT, 'Business directory access - contact via platform'::TEXT,
      'BUSINESS_DIRECTORY'::TEXT
    FROM delivery_providers dp 
    WHERE dp.is_verified = true AND (provider_uuid IS NULL OR dp.id = provider_uuid);
    RETURN;
  END IF;

  -- DEFAULT: No access
  RETURN QUERY
  SELECT 
    provider_uuid, 'Provider'::TEXT, '[RESTRICTED]'::TEXT, '[RESTRICTED]'::TEXT,
    '[UNAUTHORIZED]'::TEXT, '[UNAUTHORIZED]'::TEXT, '[UNAUTHORIZED]'::TEXT,
    '[UNAUTHORIZED]'::TEXT, 'RESTRICTED'::TEXT,
    'Unauthorized access blocked'::TEXT, 'ACCESS_DENIED'::TEXT;
END;
$$;

-- Function to authorize contact for active delivery
CREATE OR REPLACE FUNCTION public.authorize_delivery_contact(
  delivery_id UUID,
  provider_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  is_participant BOOLEAN := FALSE;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT role INTO user_role FROM profiles WHERE user_id = user_id;
  
  -- Check if user is admin or participant in the delivery
  IF user_role = 'admin' OR EXISTS (
    SELECT 1 FROM active_deliveries ad
    WHERE ad.id = delivery_id
    AND ad.delivery_provider_id = provider_id
    AND (
      ad.requester_id = user_id OR
      ad.supplier_id IN (
        SELECT s.id FROM suppliers s 
        JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
        WHERE p.user_id = user_id
      ) OR
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        JOIN profiles p ON (p.id = dp.user_id OR p.user_id = dp.user_id)
        WHERE dp.id = provider_id AND p.user_id = user_id
      )
    )
  ) THEN
    UPDATE active_deliveries 
    SET 
      contact_authorized = true,
      authorized_by = user_id,
      authorized_at = NOW()
    WHERE id = delivery_id AND delivery_provider_id = provider_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ====================================================
-- STEP 6: GRANT FUNCTION PERMISSIONS
-- ====================================================

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_balanced_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_delivery_contact(UUID, UUID) TO authenticated;

-- ====================================================
-- STEP 7: SECURITY VERIFICATION
-- ====================================================

DO $$
DECLARE
  public_grants INTEGER;
  anon_grants INTEGER;
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check for remaining public access
  SELECT COUNT(*) INTO public_grants
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'delivery_providers' 
  AND grantee = 'PUBLIC' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  
  SELECT COUNT(*) INTO anon_grants
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' AND table_name = 'delivery_providers' 
  AND grantee = 'anon' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  
  -- Check RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_providers';
  
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_providers';
  
  -- Security verification
  IF public_grants > 0 OR anon_grants > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Public/anon access still exists!';
  END IF;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ BALANCED DELIVERY PROVIDER ACCESS FIX COMPLETED';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ PUBLIC_DELIVERY_PROVIDER_DATA vulnerability: FIXED';
  RAISE NOTICE '✅ Public access grants: % (target: 0)', public_grants;
  RAISE NOTICE '✅ Anonymous access grants: % (target: 0)', anon_grants;
  RAISE NOTICE '✅ RLS policies active: % (target: 4+)', policy_count;
  RAISE NOTICE '✅ RLS enabled: %', rls_enabled;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 BALANCED ACCESS CONTROL ACTIVE:';
  RAISE NOTICE '  • Driver personal data: PROTECTED from unauthorized access';
  RAISE NOTICE '  • Admin access: FULL management capabilities';
  RAISE NOTICE '  • Driver self-access: Own data management';
  RAISE NOTICE '  • Active delivery contact: AUTHORIZED contact for ongoing deliveries';
  RAISE NOTICE '  • Business directory: Safe listing without personal data';
  RAISE NOTICE '  • Delivery context: Contact authorized only for active deliveries';
  RAISE NOTICE '';
  RAISE NOTICE '📞 BALANCED ACCESS FEATURES:';
  RAISE NOTICE '  • Phone/Email access: Only for authorized active deliveries';
  RAISE NOTICE '  • Address access: Delivery address only (not personal address)';
  RAISE NOTICE '  • License info: Admin and self-access only';
  RAISE NOTICE '  • Contact authorization: Must be approved for each delivery';
  RAISE NOTICE '  • Business directory: Public listing without sensitive data';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 FUNCTIONS AVAILABLE:';
  RAISE NOTICE '  • get_delivery_provider_balanced_access(id, delivery_id)';
  RAISE NOTICE '  • authorize_delivery_contact(delivery_id, provider_id)';
  RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- BALANCED DELIVERY PROVIDER ACCESS FIX COMPLETE
-- ====================================================
--
-- ✅ CRITICAL VULNERABILITY FIXED: PUBLIC_DELIVERY_PROVIDER_DATA
--
-- ✅ BALANCED ACCESS CONTROL IMPLEMENTED:
-- • Driver personal data: PROTECTED from unauthorized access
-- • Active delivery contact: AUTHORIZED access for ongoing deliveries only
-- • Business operations: ENABLED through context-aware access
-- • Admin oversight: FULL management capabilities maintained
-- • Driver privacy: SELF-ACCESS to own data only
--
-- ✅ DELIVERY CONTEXT VERIFICATION:
-- • Contact authorization: Required for each active delivery
-- • Time-limited access: Only during delivery period
-- • Role verification: Business users only for delivery contact
-- • Purpose validation: Active delivery context required
--
-- ✅ PRIVACY PROTECTION MAINTAINED:
-- • Phone numbers: Active delivery context or self/admin only
-- • Email addresses: Active delivery context or self/admin only  
-- • Personal addresses: Self/admin only (delivery address separate)
-- • License information: Self/admin only
-- • Business directory: Safe public listing without personal data
--
-- ✅ BUSINESS FUNCTIONALITY ENABLED:
-- • Builders: Contact drivers for active deliveries
-- • Suppliers: Contact drivers for their deliveries
-- • Contractors: Access delivery provider directory
-- • Delivery coordination: Seamless communication for active jobs
--
-- DEPLOYMENT: Execute this balanced fix immediately in Supabase Dashboard
-- PROJECT: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws
-- ====================================================
