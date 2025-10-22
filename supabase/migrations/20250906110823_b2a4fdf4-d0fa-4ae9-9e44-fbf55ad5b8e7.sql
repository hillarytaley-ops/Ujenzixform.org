-- EMERGENCY SECURITY HOTFIX - IMMEDIATE COMPLETE DATABASE LOCKDOWN
-- This applies ultra-strict RLS policies to secure all sensitive data

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

-- 2. IMMEDIATE LOCKDOWN - Revoke all dangerous public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 3. Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 4. Enable RLS on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_acknowledgements ENABLE ROW LEVEL SECURITY;

-- 5. ULTRA-STRICT PROFILES - Own data only
CREATE POLICY "emergency_profiles_lockdown" ON public.profiles
    FOR ALL TO authenticated 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. ULTRA-STRICT DELIVERIES - Admin + Authorized users only
CREATE POLICY "emergency_deliveries_lockdown" ON public.deliveries
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = deliveries.builder_id)
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.suppliers s ON s.user_id = p.id
            WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id
        )
    );

CREATE POLICY "emergency_deliveries_insert_lockdown" ON public.deliveries
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = deliveries.builder_id)
        )
    );

CREATE POLICY "emergency_deliveries_update_lockdown" ON public.deliveries
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 7. ULTRA-STRICT SUPPLIERS - Own profile + admin
CREATE POLICY "emergency_suppliers_lockdown" ON public.suppliers
    FOR ALL TO authenticated USING (
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

-- 8. ULTRA-STRICT DELIVERY PROVIDERS - Admin only
CREATE POLICY "emergency_delivery_providers_lockdown" ON public.delivery_providers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
        )
    );

-- 9. ULTRA-STRICT SENSITIVE COMMUNICATION TABLES - Admin only
CREATE POLICY "emergency_communications_lockdown" ON public.delivery_communications
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

CREATE POLICY "emergency_tracking_lockdown" ON public.delivery_tracking
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

-- 10. EMERGENCY REQUEST POLICIES - Authorized users only
CREATE POLICY "emergency_requests_lockdown" ON public.delivery_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = delivery_requests.builder_id)
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.delivery_providers dp ON dp.user_id = p.id
            WHERE p.user_id = auth.uid() AND dp.id = delivery_requests.provider_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = delivery_requests.builder_id)
        )
    );

-- Final status message
SELECT 'EMERGENCY SECURITY LOCKDOWN SUCCESSFULLY APPLIED - DATABASE SECURED WITH ULTRA-STRICT RLS POLICIES' as status;