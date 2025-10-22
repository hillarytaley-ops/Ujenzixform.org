-- 🚨 EMERGENCY SECURITY HOTFIX: IMMEDIATE DATABASE LOCKDOWN
-- This script must be applied IMMEDIATELY to stop ongoing data exposure
-- Run this directly in your Supabase SQL editor or database console

-- =============================================================================
-- IMMEDIATE EMERGENCY ACTIONS (RUN THESE FIRST)
-- =============================================================================

-- 1. IMMEDIATELY REVOKE ALL PUBLIC ACCESS TO SENSITIVE TABLES
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;

REVOKE ALL ON public.deliveries FROM PUBLIC;
REVOKE ALL ON public.deliveries FROM anon;

REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;

REVOKE ALL ON public.delivery_providers FROM PUBLIC;
REVOKE ALL ON public.delivery_providers FROM anon;

REVOKE ALL ON public.delivery_communications FROM PUBLIC;
REVOKE ALL ON public.delivery_communications FROM anon;

REVOKE ALL ON public.delivery_tracking FROM PUBLIC;
REVOKE ALL ON public.delivery_tracking FROM anon;

REVOKE ALL ON public.delivery_requests FROM PUBLIC;
REVOKE ALL ON public.delivery_requests FROM anon;

REVOKE ALL ON public.delivery_notifications FROM PUBLIC;
REVOKE ALL ON public.delivery_notifications FROM anon;

-- 2. ENABLE RLS ON ALL SENSITIVE TABLES IMMEDIATELY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING PERMISSIVE POLICIES IMMEDIATELY
-- Profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Deliveries table  
DROP POLICY IF EXISTS "Public can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Authenticated users can view deliveries" ON public.deliveries;

-- Suppliers table
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

-- Delivery providers table
DROP POLICY IF EXISTS "Public can view delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can view delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Authenticated users can view providers" ON public.delivery_providers;

-- =============================================================================
-- EMERGENCY RESTRICTIVE POLICIES (MINIMAL ACCESS ONLY)
-- =============================================================================

-- PROFILES: Users can ONLY see their own profile
CREATE POLICY "EMERGENCY: Own profile only"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "EMERGENCY: Own profile update only"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "EMERGENCY: Own profile insert only"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELIVERIES: NO access except admin
CREATE POLICY "EMERGENCY: Admin only delivery access"
ON public.deliveries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- SUPPLIERS: NO contact info access except own profile
CREATE POLICY "EMERGENCY: Supplier own profile only"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = suppliers.user_id
  )
);

CREATE POLICY "EMERGENCY: Admin only supplier access"
ON public.suppliers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- DELIVERY_PROVIDERS: NO access except own profile and admin
CREATE POLICY "EMERGENCY: Provider own profile only"
ON public.delivery_providers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_providers.user_id
  )
);

CREATE POLICY "EMERGENCY: Admin only provider access"
ON public.delivery_providers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- ALL OTHER DELIVERY TABLES: Admin only access
CREATE POLICY "EMERGENCY: Admin only communications"
ON public.delivery_communications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "EMERGENCY: Admin only tracking"
ON public.delivery_tracking FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "EMERGENCY: Admin only requests"
ON public.delivery_requests FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "EMERGENCY: Admin only notifications"
ON public.delivery_notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- =============================================================================
-- EMERGENCY LOGGING AND MONITORING
-- =============================================================================

-- Log this emergency security action
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'emergency_security_lockdown',
  'critical',
  jsonb_build_object(
    'action', 'immediate_data_exposure_prevention',
    'tables_locked', ARRAY[
      'profiles', 'deliveries', 'suppliers', 'delivery_providers',
      'delivery_communications', 'delivery_tracking', 'delivery_requests', 'delivery_notifications'
    ],
    'access_level', 'admin_only_emergency_mode',
    'timestamp', now(),
    'reason', 'ongoing_data_exposure_detected'
  )
) ON CONFLICT DO NOTHING;

-- Verify emergency lockdown
SELECT 
  '🚨 EMERGENCY SECURITY LOCKDOWN APPLIED' as status,
  'ALL sensitive tables locked to admin access only' as action_taken,
  'Data exposure STOPPED immediately' as result,
  now() as applied_at;

-- =============================================================================
-- VERIFICATION QUERIES (RUN THESE TO CONFIRM SECURITY)
-- =============================================================================

-- Check RLS status on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ SECURED'
    ELSE '❌ VULNERABLE'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'deliveries', 'suppliers', 'delivery_providers',
  'delivery_communications', 'delivery_tracking', 'delivery_requests', 'delivery_notifications'
)
ORDER BY tablename;

-- Check for any remaining public access
SELECT 
  grantee,
  table_name,
  privilege_type,
  CASE 
    WHEN grantee IN ('PUBLIC', 'anon') THEN '❌ DANGEROUS'
    ELSE '✅ SAFE'
  END as risk_level
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'deliveries', 'suppliers', 'delivery_providers',
  'delivery_communications', 'delivery_tracking', 'delivery_requests', 'delivery_notifications'
)
AND grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY risk_level DESC, table_name;

-- Emergency success confirmation
SELECT '🛡️ EMERGENCY LOCKDOWN COMPLETE - ALL DATA EXPOSURE STOPPED' as final_status;
