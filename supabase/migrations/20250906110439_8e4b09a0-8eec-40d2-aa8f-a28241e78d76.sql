-- EMERGENCY SECURITY HOTFIX - IMMEDIATE DATABASE LOCKDOWN
-- This script immediately secures all sensitive tables with ultra-strict RLS policies

-- 1. IMMEDIATE LOCKDOWN - Revoke all public access to sensitive tables
REVOKE ALL ON public.profiles FROM public, anon, authenticated;
REVOKE ALL ON public.deliveries FROM public, anon, authenticated;
REVOKE ALL ON public.suppliers FROM public, anon, authenticated;
REVOKE ALL ON public.delivery_providers FROM public, anon, authenticated;
REVOKE ALL ON public.delivery_communications FROM public, anon, authenticated;
REVOKE ALL ON public.delivery_tracking FROM public, anon, authenticated;
REVOKE ALL ON public.delivery_requests FROM public, anon, authenticated;

-- 2. Ensure RLS is enabled on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "emergency_profiles_own_only" ON public.profiles;
DROP POLICY IF EXISTS "emergency_deliveries_admin_only" ON public.deliveries;
DROP POLICY IF EXISTS "emergency_suppliers_own_profile_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_suppliers_own_insert_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_suppliers_own_update_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_delivery_providers_admin_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "emergency_delivery_communications_admin_only" ON public.delivery_communications;
DROP POLICY IF EXISTS "emergency_delivery_tracking_admin_only" ON public.delivery_tracking;
DROP POLICY IF EXISTS "emergency_delivery_requests_admin_only" ON public.delivery_requests;

-- Drop any other existing policies that might be permissive
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('profiles', 'deliveries', 'suppliers', 'delivery_providers', 
                               'delivery_communications', 'delivery_tracking', 'delivery_requests'))
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- 4. Create ULTRA-STRICT emergency policies

-- PROFILES: Users can only access their own profile
CREATE POLICY "emergency_ultra_strict_profiles" ON public.profiles
    FOR ALL USING (user_id = auth.uid());

-- DELIVERIES: ADMIN ONLY ACCESS
CREATE POLICY "emergency_ultra_strict_deliveries" ON public.deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- SUPPLIERS: Own profile + admin access only
CREATE POLICY "emergency_ultra_strict_suppliers_select" ON public.suppliers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

CREATE POLICY "emergency_ultra_strict_suppliers_modify" ON public.suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

-- DELIVERY PROVIDERS: ADMIN ONLY ACCESS
CREATE POLICY "emergency_ultra_strict_delivery_providers" ON public.delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- DELIVERY COMMUNICATIONS: ADMIN ONLY ACCESS
CREATE POLICY "emergency_ultra_strict_delivery_communications" ON public.delivery_communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- DELIVERY TRACKING: ADMIN ONLY ACCESS
CREATE POLICY "emergency_ultra_strict_delivery_tracking" ON public.delivery_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- DELIVERY REQUESTS: ADMIN ONLY ACCESS
CREATE POLICY "emergency_ultra_strict_delivery_requests" ON public.delivery_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Create emergency logging table
CREATE TABLE IF NOT EXISTS public.emergency_lockdown_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lockdown_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by_user UUID DEFAULT auth.uid(),
    security_level TEXT DEFAULT 'ULTRA_STRICT',
    affected_tables TEXT[] DEFAULT ARRAY[
        'profiles', 'deliveries', 'suppliers', 'delivery_providers',
        'delivery_communications', 'delivery_tracking', 'delivery_requests'
    ]
);

-- Log this emergency action
INSERT INTO public.emergency_lockdown_log (lockdown_timestamp, applied_by_user)
VALUES (NOW(), auth.uid());

-- 6. Final verification
SELECT 
    'EMERGENCY SECURITY LOCKDOWN ACTIVE' as status,
    COUNT(*) as secured_tables
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN (
    'profiles', 'deliveries', 'suppliers', 'delivery_providers',
    'delivery_communications', 'delivery_tracking', 'delivery_requests'
);