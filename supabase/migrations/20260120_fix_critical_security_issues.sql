-- =====================================================================
-- FIX CRITICAL SECURITY ISSUES
-- =====================================================================
-- This migration addresses:
-- 1. SECURITY DEFINER views (4 views)
-- 2. Publicly accessible tables without proper RLS (5 tables)
-- =====================================================================

-- =====================================================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- =====================================================================
-- These views should use SECURITY INVOKER to respect RLS policies

-- 1. Fix registration_summary view
DROP VIEW IF EXISTS public.registration_summary;
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

COMMENT ON VIEW public.registration_summary IS 
'Registration summary statistics. Uses SECURITY INVOKER to respect RLS.';

-- 2. Fix camera_directory_safe view
DROP VIEW IF EXISTS public.camera_directory_safe;
CREATE VIEW public.camera_directory_safe 
WITH (security_invoker = true)
AS
SELECT 
    id,
    name,
    location,
    status,
    created_at,
    -- Exclude sensitive fields like IP addresses, credentials, etc.
    CASE 
        WHEN status = 'active' THEN 'Online'
        WHEN status = 'inactive' THEN 'Offline'
        ELSE 'Unknown'
    END as status_display
FROM public.cameras
WHERE status IS NOT NULL;

COMMENT ON VIEW public.camera_directory_safe IS 
'Safe view of camera directory without sensitive information. Uses SECURITY INVOKER.';

-- 3. Fix daily_registration_stats view
DROP VIEW IF EXISTS public.daily_registration_stats;
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

COMMENT ON VIEW public.daily_registration_stats IS 
'Daily registration statistics for the last 30 days. Uses SECURITY INVOKER.';

-- 4. Fix supplier_qr_codes_with_clients view (already in separate migration but included for completeness)
DROP VIEW IF EXISTS public.supplier_qr_codes_with_clients;
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
    mi.buyer_id,
    mi.buyer_name,
    mi.buyer_email,
    mi.buyer_phone,
    mi.item_unit_price,
    mi.item_total_price,
    mi.dispatch_scanned,
    mi.dispatch_scanned_at,
    mi.receive_scanned,
    mi.receive_scanned_at,
    mi.qr_code_generated_at,
    mi.supplier_id,
    mi.purchase_order_id,
    po.po_number,
    po.delivery_address,
    po.delivery_date,
    s.company_name as supplier_name
FROM public.material_items mi
JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN public.suppliers s ON s.id = mi.supplier_id;

COMMENT ON VIEW public.supplier_qr_codes_with_clients IS 
'QR codes with client information for suppliers. Uses SECURITY INVOKER.';

-- =====================================================================
-- PART 2: FIX PUBLICLY ACCESSIBLE TABLES
-- =====================================================================
-- Enable RLS and create proper policies for tables that are publicly accessible

-- =====================================================================
-- 2.1 PROFILES TABLE
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Allow users to insert their own profile (for registration)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- =====================================================================
-- 2.2 PAYMENTS TABLE
-- =====================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR buyer_id = auth.uid());

-- Users can create payments for themselves
CREATE POLICY "Users can insert own payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR buyer_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can update payments (for status changes, refunds, etc.)
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- =====================================================================
-- 2.3 DELIVERIES TABLE
-- =====================================================================
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view related deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can update assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can update all deliveries" ON public.deliveries;

-- Builders can view their own deliveries
CREATE POLICY "Users can view own deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (builder_id = auth.uid());

-- Builders can create deliveries
CREATE POLICY "Users can create deliveries"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (builder_id = auth.uid());

-- Delivery providers can view deliveries assigned to them
CREATE POLICY "Delivery providers can view assigned deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
    provider_id IN (
        SELECT id FROM public.delivery_providers 
        WHERE user_id = auth.uid()
    )
);

-- Delivery providers can update deliveries assigned to them
CREATE POLICY "Delivery providers can update assigned deliveries"
ON public.deliveries FOR UPDATE TO authenticated
USING (
    provider_id IN (
        SELECT id FROM public.delivery_providers 
        WHERE user_id = auth.uid()
    )
);

-- Suppliers can view deliveries for their orders
CREATE POLICY "Suppliers can view deliveries for their orders"
ON public.deliveries FOR SELECT TO authenticated
USING (
    supplier_id IN (
        SELECT id FROM public.suppliers 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view all deliveries
CREATE POLICY "Admins can view all deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can update all deliveries
CREATE POLICY "Admins can update all deliveries"
ON public.deliveries FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- =====================================================================
-- 2.4 SUPPLIERS TABLE
-- =====================================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can view own record" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update own record" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can view all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view active suppliers" ON public.suppliers;

-- Public can view basic info of active suppliers (for marketplace)
CREATE POLICY "Public can view active suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (status = 'active');

-- Suppliers can view their own full record
CREATE POLICY "Suppliers can view own record"
ON public.suppliers FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Suppliers can update their own record
CREATE POLICY "Suppliers can update own record"
ON public.suppliers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all suppliers
CREATE POLICY "Admins can view all suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can update all suppliers
CREATE POLICY "Admins can update all suppliers"
ON public.suppliers FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can insert suppliers
CREATE POLICY "Admins can insert suppliers"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
    OR user_id = auth.uid()
);

-- =====================================================================
-- 2.5 DELIVERY_PROVIDERS TABLE
-- =====================================================================
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Delivery providers can view own record" ON public.delivery_providers;
DROP POLICY IF EXISTS "Delivery providers can update own record" ON public.delivery_providers;
DROP POLICY IF EXISTS "Admins can view all delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Admins can update all delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Public can view active delivery providers" ON public.delivery_providers;

-- Public can view active delivery providers
CREATE POLICY "Public can view active delivery providers"
ON public.delivery_providers FOR SELECT TO authenticated
USING (status = 'active' OR status = 'approved');

-- Delivery providers can view their own record
CREATE POLICY "Delivery providers can view own record"
ON public.delivery_providers FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Delivery providers can update their own record
CREATE POLICY "Delivery providers can update own record"
ON public.delivery_providers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all delivery providers
CREATE POLICY "Admins can view all delivery providers"
ON public.delivery_providers FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can update all delivery providers
CREATE POLICY "Admins can update all delivery providers"
ON public.delivery_providers FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Admins can insert delivery providers
CREATE POLICY "Admins can insert delivery providers"
ON public.delivery_providers FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'super_admin')
    )
    OR user_id = auth.uid()
);

-- =====================================================================
-- SUMMARY
-- =====================================================================
-- Fixed 4 SECURITY DEFINER views:
-- 1. registration_summary -> SECURITY INVOKER
-- 2. camera_directory_safe -> SECURITY INVOKER
-- 3. daily_registration_stats -> SECURITY INVOKER
-- 4. supplier_qr_codes_with_clients -> SECURITY INVOKER
--
-- Secured 5 publicly accessible tables with RLS:
-- 1. profiles - Users see own, admins see all
-- 2. payments - Users see own, admins see all
-- 3. deliveries - Builders see own, providers see assigned, admins see all
-- 4. suppliers - Public sees active, owners see own, admins see all
-- 5. delivery_providers - Public sees active, owners see own, admins see all
-- =====================================================================

