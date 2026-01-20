-- =====================================================================
-- FIX SECURITY ISSUES V2 - Simplified approach
-- =====================================================================
-- Run each section separately if needed
-- =====================================================================

-- =====================================================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- =====================================================================

-- 1. Drop and recreate registration_summary with SECURITY INVOKER
DROP VIEW IF EXISTS public.registration_summary CASCADE;
CREATE VIEW public.registration_summary 
WITH (security_invoker = true)
AS
SELECT 
    DATE(created_at) as registration_date,
    COUNT(*) as total_registrations,
    COUNT(CASE WHEN user_type = 'professional_builder' THEN 1 END) as professional_builders,
    COUNT(CASE WHEN user_type = 'private_client' THEN 1 END) as private_clients,
    COUNT(CASE WHEN user_type = 'supplier' THEN 1 END) as suppliers,
    COUNT(CASE WHEN user_type = 'delivery_provider' THEN 1 END) as delivery_providers
FROM public.profiles
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- 2. Drop camera_directory_safe (don't recreate if cameras table structure is unknown)
DROP VIEW IF EXISTS public.camera_directory_safe CASCADE;

-- 3. Drop and recreate daily_registration_stats with SECURITY INVOKER
DROP VIEW IF EXISTS public.daily_registration_stats CASCADE;
CREATE VIEW public.daily_registration_stats 
WITH (security_invoker = true)
AS
SELECT 
    DATE(created_at) as stat_date,
    COUNT(*) as new_users,
    COUNT(CASE WHEN user_type = 'professional_builder' THEN 1 END) as new_builders,
    COUNT(CASE WHEN user_type = 'private_client' THEN 1 END) as new_clients,
    COUNT(CASE WHEN user_type = 'supplier' THEN 1 END) as new_suppliers
FROM public.profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

-- 4. Drop and recreate supplier_qr_codes_with_clients with SECURITY INVOKER
DROP VIEW IF EXISTS public.supplier_qr_codes_with_clients CASCADE;
CREATE VIEW public.supplier_qr_codes_with_clients 
WITH (security_invoker = true)
AS
SELECT 
    mi.id,
    mi.qr_code,
    mi.material_type,
    mi.category,
    mi.quantity,
    mi.unit,
    mi.status,
    mi.supplier_id,
    mi.purchase_order_id,
    po.po_number,
    s.company_name as supplier_name
FROM public.material_items mi
JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN public.suppliers s ON s.id = mi.supplier_id;

-- =====================================================================
-- PART 2: ENABLE RLS ON TABLES (without creating policies yet)
-- =====================================================================

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payments  
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on delivery_providers
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PART 3: CREATE SIMPLE RLS POLICIES
-- =====================================================================

-- PROFILES: Allow authenticated users to read all profiles, update own
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() = id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- PAYMENTS: Users see own, admins see all
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;

CREATE POLICY "payments_select_policy" ON public.payments 
FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "payments_insert_policy" ON public.payments 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_policy" ON public.payments 
FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- DELIVERIES: Builders see own, admins see all
DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;

CREATE POLICY "deliveries_select_policy" ON public.deliveries 
FOR SELECT TO authenticated 
USING (
    builder_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'delivery_provider', 'supplier'))
);

CREATE POLICY "deliveries_insert_policy" ON public.deliveries 
FOR INSERT TO authenticated 
WITH CHECK (builder_id = auth.uid());

CREATE POLICY "deliveries_update_policy" ON public.deliveries 
FOR UPDATE TO authenticated 
USING (
    builder_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'delivery_provider'))
);

-- SUPPLIERS: All authenticated can read, owners can update
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON public.suppliers;

CREATE POLICY "suppliers_select_policy" ON public.suppliers 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_update_policy" ON public.suppliers 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "suppliers_insert_policy" ON public.suppliers 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- DELIVERY_PROVIDERS: All authenticated can read, owners can update
DROP POLICY IF EXISTS "delivery_providers_select_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_update_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_insert_policy" ON public.delivery_providers;

CREATE POLICY "delivery_providers_select_policy" ON public.delivery_providers 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "delivery_providers_update_policy" ON public.delivery_providers 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "delivery_providers_insert_policy" ON public.delivery_providers 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- =====================================================================
-- DONE
-- =====================================================================
SELECT 'Security fixes applied successfully' as result;

