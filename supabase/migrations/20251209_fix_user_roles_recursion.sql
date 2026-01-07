-- ============================================================================
-- FIX USER_ROLES INFINITE RECURSION
-- The user_roles table cannot reference itself in RLS policies
-- ============================================================================

-- Drop ALL existing policies on user_roles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles (simple, no recursion)
CREATE POLICY "user_roles_own_select"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Only service role can insert/update/delete roles
-- This prevents users from giving themselves admin access

-- Grant select to authenticated users
GRANT SELECT ON public.user_roles TO authenticated;

-- ============================================================================
-- NOW FIX ALL OTHER POLICIES TO USE A FUNCTION INSTEAD OF DIRECT QUERY
-- This prevents recursion by using SECURITY DEFINER function
-- ============================================================================

-- Create a helper function to check if user is admin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- UPDATE ALL POLICIES TO USE is_admin() FUNCTION
-- ============================================================================

-- MONITORING SERVICE REQUESTS
DROP POLICY IF EXISTS "monitoring_requests_admin_full" ON public.monitoring_service_requests;
CREATE POLICY "monitoring_requests_admin_full"
ON public.monitoring_service_requests FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELIVERY REQUESTS
DROP POLICY IF EXISTS "delivery_requests_admin_full" ON public.delivery_requests;
CREATE POLICY "delivery_requests_admin_full"
ON public.delivery_requests FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "purchase_orders_admin_full" ON public.purchase_orders;
CREATE POLICY "purchase_orders_admin_full"
ON public.purchase_orders FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- BUILDER REGISTRATIONS
DROP POLICY IF EXISTS "builder_reg_admin" ON public.builder_registrations;
CREATE POLICY "builder_reg_admin"
ON public.builder_registrations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- SUPPLIER REGISTRATIONS
DROP POLICY IF EXISTS "supplier_reg_admin" ON public.supplier_registrations;
CREATE POLICY "supplier_reg_admin"
ON public.supplier_registrations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELIVERY PROVIDER REGISTRATIONS
DROP POLICY IF EXISTS "delivery_reg_admin" ON public.delivery_provider_registrations;
CREATE POLICY "delivery_reg_admin"
ON public.delivery_provider_registrations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- FEEDBACK
DROP POLICY IF EXISTS "feedback_admin" ON public.feedback;
CREATE POLICY "feedback_admin"
ON public.feedback FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PROFILES
DROP POLICY IF EXISTS "profiles_admin" ON public.profiles;
CREATE POLICY "profiles_admin"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- INVOICES
DROP POLICY IF EXISTS "invoices_admin" ON public.invoices;
CREATE POLICY "invoices_admin"
ON public.invoices FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- DONE
-- ============================================================================

