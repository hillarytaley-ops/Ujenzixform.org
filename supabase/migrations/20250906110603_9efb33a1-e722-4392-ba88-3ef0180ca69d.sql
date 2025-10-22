-- EMERGENCY SECURITY HOTFIX - COMPLETE DATABASE LOCKDOWN
-- Clear existing emergency policies and apply comprehensive security

-- 1. Drop any existing emergency policies first
DROP POLICY IF EXISTS "emergency_profiles_own_only" ON public.profiles;
DROP POLICY IF EXISTS "emergency_deliveries_admin_only" ON public.deliveries;
DROP POLICY IF EXISTS "emergency_suppliers_own_profile_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_suppliers_own_insert_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_suppliers_own_update_only" ON public.suppliers;
DROP POLICY IF EXISTS "emergency_delivery_providers_admin_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "emergency_delivery_communications_admin_only" ON public.delivery_communications;
DROP POLICY IF EXISTS "emergency_delivery_tracking_admin_only" ON public.delivery_tracking;
DROP POLICY IF EXISTS "emergency_delivery_requests_admin_only" ON public.delivery_requests;

-- 2. IMMEDIATE LOCKDOWN - Revoke all public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 3. Grant necessary schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 4. Enable RLS on all sensitive tables (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- 5. ULTRA-STRICT PROFILES - Users can only access their own data
CREATE POLICY "emergency_profiles_own_only" ON public.profiles
    FOR ALL TO authenticated USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. ULTRA-STRICT DELIVERIES - Admin only access
CREATE POLICY "emergency_deliveries_admin_only" ON public.deliveries
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 7. ULTRA-STRICT SUPPLIERS - Own profile + admin access
CREATE POLICY "emergency_suppliers_own_profile_only" ON public.suppliers
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

CREATE POLICY "emergency_suppliers_own_insert_only" ON public.suppliers
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.id = suppliers.user_id
        )
    );

CREATE POLICY "emergency_suppliers_own_update_only" ON public.suppliers
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

-- 8. ULTRA-STRICT DELIVERY PROVIDERS - Admin only access
CREATE POLICY "emergency_delivery_providers_admin_only" ON public.delivery_providers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 9. ULTRA-STRICT OTHER SENSITIVE TABLES - Admin only
CREATE POLICY "emergency_delivery_communications_admin_only" ON public.delivery_communications
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_delivery_tracking_admin_only" ON public.delivery_tracking
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_delivery_requests_admin_only" ON public.delivery_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Log the emergency security action (only if security_events table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_events') THEN
        INSERT INTO public.security_events (event_type, user_id, details)
        VALUES (
            'EMERGENCY_SECURITY_LOCKDOWN',
            auth.uid(),
            '{"action": "emergency_rls_policies_applied", "description": "Emergency security lockdown activated - all sensitive data access restricted"}'::jsonb
        );
    END IF;
END $$;

-- Final confirmation
SELECT 'EMERGENCY SECURITY LOCKDOWN SUCCESSFULLY APPLIED - ALL SENSITIVE DATA ACCESS RESTRICTED TO AUTHORIZED USERS ONLY' as status;