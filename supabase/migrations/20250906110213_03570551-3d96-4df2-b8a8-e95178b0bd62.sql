-- EMERGENCY SECURITY HOTFIX - IMMEDIATE DATABASE LOCKDOWN
-- This script immediately secures all sensitive tables with ultra-strict RLS policies

-- 1. IMMEDIATE LOCKDOWN - Revoke all public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 2. Enable RLS on all sensitive tables
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
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing permissive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Drop delivery policies
DROP POLICY IF EXISTS "Builder view own" ON public.deliveries;
DROP POLICY IF EXISTS "Builder select own" ON public.deliveries;
DROP POLICY IF EXISTS "Builder create own" ON public.deliveries;
DROP POLICY IF EXISTS "Builder insert own" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier view assigned" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier select assigned" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier update assigned" ON public.deliveries;
DROP POLICY IF EXISTS "Supplier update status" ON public.deliveries;
DROP POLICY IF EXISTS "Admin access only" ON public.deliveries;
DROP POLICY IF EXISTS "Admin full access" ON public.deliveries;

-- Drop supplier policies
DROP POLICY IF EXISTS "Suppliers can insert their own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update their own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view supplier profiles" ON public.suppliers;

-- Drop delivery provider policies
DROP POLICY IF EXISTS "delivery_providers_owner_manage_own" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_full_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_authorized_business_contact" ON public.delivery_providers;

-- 4. Create ultra-strict policies - PROFILES
CREATE POLICY "emergency_profiles_own_only" ON public.profiles
    FOR ALL USING (user_id = auth.uid());

-- 5. Create ultra-strict policies - DELIVERIES (Admin only)
CREATE POLICY "emergency_deliveries_admin_only" ON public.deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Create ultra-strict policies - SUPPLIERS
CREATE POLICY "emergency_suppliers_own_profile_only" ON public.suppliers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

CREATE POLICY "emergency_suppliers_own_insert_only" ON public.suppliers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.id = suppliers.user_id
        )
    );

CREATE POLICY "emergency_suppliers_own_update_only" ON public.suppliers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = suppliers.user_id)
        )
    );

-- 7. Create ultra-strict policies - DELIVERY PROVIDERS (Admin only access)
CREATE POLICY "emergency_delivery_providers_admin_only" ON public.delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Create ultra-strict policies - OTHER SENSITIVE TABLES
CREATE POLICY "emergency_delivery_communications_admin_only" ON public.delivery_communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_delivery_tracking_admin_only" ON public.delivery_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_delivery_requests_admin_only" ON public.delivery_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 9. Create security events table for emergency logging
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emergency_security_events_admin_only" ON public.security_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Log the emergency security action
INSERT INTO public.security_events (event_type, user_id, event_details)
VALUES (
    'EMERGENCY_SECURITY_LOCKDOWN',
    auth.uid(),
    jsonb_build_object(
        'action', 'emergency_rls_policies_applied',
        'timestamp', NOW(),
        'description', 'Emergency security lockdown activated - all sensitive data access restricted'
    )
);

-- 11. Verification queries
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'profiles', 'deliveries', 'suppliers', 'delivery_providers',
    'delivery_communications', 'delivery_tracking', 'delivery_requests'
)
ORDER BY tablename;

-- Final confirmation
SELECT 'EMERGENCY SECURITY LOCKDOWN COMPLETED - ALL SENSITIVE DATA ACCESS RESTRICTED TO AUTHORIZED USERS ONLY' as status;