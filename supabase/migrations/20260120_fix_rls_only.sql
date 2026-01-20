-- =====================================================================
-- PART 2: ENABLE RLS ON TABLES
-- Run this after the views are fixed
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (important!)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- PROFILES POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = id);
CREATE POLICY "profiles_create" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- =====================================================================
-- PAYMENTS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "payments_write" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- =====================================================================
-- DELIVERIES POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can create deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can update assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Suppliers can view deliveries for their orders" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can update all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Anyone can create deliveries" ON public.deliveries;

CREATE POLICY "deliveries_read" ON public.deliveries FOR SELECT TO authenticated USING (builder_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY "deliveries_write" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (builder_id = auth.uid());
CREATE POLICY "deliveries_update" ON public.deliveries FOR UPDATE TO authenticated USING (builder_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- =====================================================================
-- SUPPLIERS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can view own record" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update own record" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can view all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view active suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;

CREATE POLICY "suppliers_read" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_write" ON public.suppliers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "suppliers_create" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- =====================================================================
-- DELIVERY_PROVIDERS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "delivery_providers_select_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_update_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_insert_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "Anyone can view delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Delivery providers can view own record" ON public.delivery_providers;
DROP POLICY IF EXISTS "Delivery providers can update own record" ON public.delivery_providers;
DROP POLICY IF EXISTS "Admins can view all delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Admins can update all delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Admins can insert delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Public can view active delivery providers" ON public.delivery_providers;
DROP POLICY IF EXISTS "Public can view delivery providers" ON public.delivery_providers;

CREATE POLICY "delivery_providers_read" ON public.delivery_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_providers_write" ON public.delivery_providers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "delivery_providers_create" ON public.delivery_providers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

SELECT 'RLS enabled and policies created' as status;

