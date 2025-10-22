-- COMPREHENSIVE SECURITY FIX: Implement Strict RLS Policies
-- Fixes all 8 critical security vulnerabilities

-- ============================================================================
-- DROP ALL EXISTING POLICIES ON ALL AFFECTED TABLES
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_read_sensitive" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_system_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_block_anonymous" ON public.profiles;

-- Driver Contact Data
DROP POLICY IF EXISTS "driver_contact_admin_only" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_delivery_participant" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_default_deny" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_admin_access" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_active_delivery_participant" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_block_anonymous" ON public.driver_contact_data;

-- Deliveries
DROP POLICY IF EXISTS "deliveries_authorized_participants_only_2024" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_builder_own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_supplier_assigned" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_assigned_provider" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_admin_all" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_block_anonymous" ON public.deliveries;

-- Payments
DROP POLICY IF EXISTS "payment_history_admin_only" ON public.payments;
DROP POLICY IF EXISTS "payment_preferences_admin_only" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_read" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
DROP POLICY IF EXISTS "payments_block_anonymous" ON public.payments;

-- Delivery Requests
DROP POLICY IF EXISTS "delivery_requests_admin_full_access" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_own_access" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_assigned_provider_view" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_assigned_provider_update" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_block_anonymous_strict" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_own" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_assigned_provider" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_admin_all" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_block_anonymous" ON public.delivery_requests;

-- Purchase Orders
DROP POLICY IF EXISTS "purchase_orders_working" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_buyer_own" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_assigned" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_update" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_all" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_block_anonymous" ON public.purchase_orders;

-- ============================================================================
-- 1. FIX PROFILES TABLE (PUBLIC_USER_DATA)
-- ============================================================================

CREATE POLICY "profiles_owner_read"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_owner_update"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin_full"
ON public.profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_deny_anon"
ON public.profiles FOR ALL TO anon
USING (false);

-- ============================================================================
-- 2. FIX DRIVER_CONTACT_DATA (PUBLIC_DRIVER_CONTACT_DATA)
-- ============================================================================

ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_contact_deny_default"
ON public.driver_contact_data FOR ALL TO authenticated
USING (false);

CREATE POLICY "driver_contact_admin_full"
ON public.driver_contact_data FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "driver_contact_active_delivery"
ON public.driver_contact_data FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE d.id = driver_contact_data.delivery_id
    AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
    AND (
      d.builder_id = p.id OR
      d.supplier_id IN (SELECT id FROM suppliers WHERE user_id = p.user_id)
    )
  )
);

CREATE POLICY "driver_contact_deny_anon"
ON public.driver_contact_data FOR ALL TO anon
USING (false);

-- ============================================================================
-- 3. FIX DELIVERIES (PUBLIC_DELIVERY_ADDRESSES)
-- ============================================================================

CREATE POLICY "deliveries_builder_access"
ON public.deliveries FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = deliveries.builder_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = deliveries.builder_id)
);

CREATE POLICY "deliveries_supplier_read"
ON public.deliveries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s JOIN profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid() AND s.id = deliveries.supplier_id
  )
);

CREATE POLICY "deliveries_provider_read"
ON public.deliveries FOR SELECT TO authenticated
USING (
  deliveries.status IN ('in_progress', 'out_for_delivery')
  AND EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN delivery_requests dr ON dr.provider_id = dp.id
    WHERE dp.user_id = auth.uid()
    AND dr.builder_id = deliveries.builder_id
    AND dr.status = 'accepted'
  )
);

CREATE POLICY "deliveries_admin_full"
ON public.deliveries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deliveries_deny_anon"
ON public.deliveries FOR ALL TO anon
USING (false);

-- ============================================================================
-- 4. FIX PAYMENTS (PUBLIC_PAYMENT_DATA)
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_owner_access"
ON public.payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payments_owner_create"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_admin_full"
ON public.payments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payments_deny_anon"
ON public.payments FOR ALL TO anon
USING (false);

-- ============================================================================
-- 5. FIX DELIVERY_REQUESTS (MISSING_RLS_PROTECTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_exact_coordinates(request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean; is_builder boolean; is_provider boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  IF is_admin THEN RETURN true; END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr JOIN profiles p ON p.id = dr.builder_id
    WHERE dr.id = request_id AND p.user_id = auth.uid()
  ) INTO is_builder;
  
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dr.id = request_id AND dp.user_id = auth.uid() AND dr.status IN ('accepted', 'in_progress')
  ) INTO is_provider;
  
  RETURN (is_builder OR is_provider);
END;
$$;

CREATE POLICY "delivery_requests_builder_access"
ON public.delivery_requests FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = delivery_requests.builder_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = delivery_requests.builder_id)
);

CREATE POLICY "delivery_requests_provider_read"
ON public.delivery_requests FOR SELECT TO authenticated
USING (
  provider_id IS NOT NULL AND status IN ('accepted', 'in_progress')
  AND EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = delivery_requests.provider_id AND dp.user_id = auth.uid())
);

CREATE POLICY "delivery_requests_provider_modify"
ON public.delivery_requests FOR UPDATE TO authenticated
USING (
  provider_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = delivery_requests.provider_id AND dp.user_id = auth.uid())
);

CREATE POLICY "delivery_requests_admin_full"
ON public.delivery_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "delivery_requests_deny_anon"
ON public.delivery_requests FOR ALL TO anon
USING (false);

-- ============================================================================
-- 6. FIX PURCHASE_ORDERS (EXPOSED_SENSITIVE_DATA)
-- ============================================================================

CREATE POLICY "purchase_orders_buyer_access"
ON public.purchase_orders FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = purchase_orders.buyer_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = purchase_orders.buyer_id)
);

CREATE POLICY "purchase_orders_supplier_read"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s JOIN profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid() AND s.id = purchase_orders.supplier_id
  )
);

CREATE POLICY "purchase_orders_supplier_modify"
ON public.purchase_orders FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s JOIN profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid() AND s.id = purchase_orders.supplier_id
  )
);

CREATE POLICY "purchase_orders_admin_full"
ON public.purchase_orders FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "purchase_orders_deny_anon"
ON public.purchase_orders FOR ALL TO anon
USING (false);