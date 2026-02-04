-- =============================================
-- FIX PURCHASE FLOW RLS POLICIES
-- =============================================
-- This fixes the data flow from private builder purchases to:
-- 1. Supplier Dashboard (see orders)
-- 2. Admin Dashboard (see all orders)
-- 3. Delivery Provider Dashboard (see delivery requests)
-- 4. QR Code generation (triggered on confirmed orders)
-- =============================================

-- =============================================
-- 1. FIX PURCHASE_ORDERS RLS POLICIES
-- =============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "purchase_orders_builder_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_view" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_update" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_all" ON purchase_orders;
DROP POLICY IF EXISTS "Builders can view own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Suppliers can view assigned orders" ON purchase_orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON purchase_orders;

-- Builders can manage their own orders
CREATE POLICY "purchase_orders_builder_access" ON purchase_orders
FOR ALL TO authenticated
USING (buyer_id = (select auth.uid()))
WITH CHECK (buyer_id = (select auth.uid()));

-- Suppliers can view orders assigned to them (via supplier_id)
CREATE POLICY "purchase_orders_supplier_view" ON purchase_orders
FOR SELECT TO authenticated
USING (
  supplier_id = (select auth.uid()) OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid())) OR
  supplier_id IN (SELECT user_id FROM suppliers WHERE user_id = (select auth.uid()))
);

-- Suppliers can update orders assigned to them (for quote responses)
CREATE POLICY "purchase_orders_supplier_update" ON purchase_orders
FOR UPDATE TO authenticated
USING (
  supplier_id = (select auth.uid()) OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
)
WITH CHECK (
  supplier_id = (select auth.uid()) OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
);

-- Admins can do everything
CREATE POLICY "purchase_orders_admin_all" ON purchase_orders
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- =============================================
-- 2. FIX DELIVERY_REQUESTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "delivery_requests_builder_access" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_access" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_admin_access" ON delivery_requests;
DROP POLICY IF EXISTS "Builders can view own delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Delivery providers can view pending requests" ON delivery_requests;

-- Builders can manage their own delivery requests
CREATE POLICY "delivery_requests_builder_access" ON delivery_requests
FOR ALL TO authenticated
USING (
  builder_id = (select auth.uid()) OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
)
WITH CHECK (
  builder_id = (select auth.uid()) OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = (select auth.uid()))
);

-- Delivery providers can view ALL pending requests (so they can accept them)
CREATE POLICY "delivery_requests_provider_view_pending" ON delivery_requests
FOR SELECT TO authenticated
USING (
  status = 'pending' OR
  driver_id = (select auth.uid()) OR
  provider_id = (select auth.uid()) OR
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = (select auth.uid()))
);

-- Delivery providers can update requests they've accepted
CREATE POLICY "delivery_requests_provider_update" ON delivery_requests
FOR UPDATE TO authenticated
USING (
  driver_id = (select auth.uid()) OR
  provider_id = (select auth.uid()) OR
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = (select auth.uid()))
);

-- Admins can do everything
CREATE POLICY "delivery_requests_admin_all" ON delivery_requests
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- =============================================
-- 3. FIX MATERIAL_ITEMS (QR CODES) RLS POLICIES
-- =============================================

-- Check if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_items') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "material_items_supplier_view" ON material_items;
    DROP POLICY IF EXISTS "material_items_builder_view" ON material_items;
    DROP POLICY IF EXISTS "material_items_admin_all" ON material_items;
    
    -- Suppliers can view their own material items (QR codes)
    EXECUTE 'CREATE POLICY "material_items_supplier_view" ON material_items
      FOR SELECT TO authenticated
      USING (
        supplier_id = (select auth.uid()) OR
        supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
      )';
    
    -- Builders can view QR codes for their orders
    EXECUTE 'CREATE POLICY "material_items_builder_view" ON material_items
      FOR SELECT TO authenticated
      USING (
        purchase_order_id IN (SELECT id FROM purchase_orders WHERE buyer_id = (select auth.uid()))
      )';
    
    -- Admins can do everything
    EXECUTE 'CREATE POLICY "material_items_admin_all" ON material_items
      FOR ALL TO authenticated
      USING (public.is_admin_no_rls())
      WITH CHECK (public.is_admin_no_rls())';
  END IF;
END $$;

-- =============================================
-- 4. FIX MATERIAL_QR_CODES RLS POLICIES
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_qr_codes') THEN
    DROP POLICY IF EXISTS "material_qr_codes_supplier_view" ON material_qr_codes;
    DROP POLICY IF EXISTS "material_qr_codes_builder_view" ON material_qr_codes;
    DROP POLICY IF EXISTS "material_qr_codes_admin_all" ON material_qr_codes;
    
    -- Suppliers can view their own QR codes
    EXECUTE 'CREATE POLICY "material_qr_codes_supplier_view" ON material_qr_codes
      FOR SELECT TO authenticated
      USING (
        supplier_id = (select auth.uid()) OR
        supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
      )';
    
    -- Builders can view QR codes for their orders
    EXECUTE 'CREATE POLICY "material_qr_codes_builder_view" ON material_qr_codes
      FOR SELECT TO authenticated
      USING (
        purchase_order_id IN (SELECT id FROM purchase_orders WHERE buyer_id = (select auth.uid()))
      )';
    
    -- Admins can do everything
    EXECUTE 'CREATE POLICY "material_qr_codes_admin_all" ON material_qr_codes
      FOR ALL TO authenticated
      USING (public.is_admin_no_rls())
      WITH CHECK (public.is_admin_no_rls())';
  END IF;
END $$;

-- =============================================
-- 5. FIX SUPPLIERS TABLE RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "suppliers_view_all" ON suppliers;
DROP POLICY IF EXISTS "suppliers_own_access" ON suppliers;
DROP POLICY IF EXISTS "suppliers_admin_access" ON suppliers;

-- Anyone can view suppliers (for marketplace)
CREATE POLICY "suppliers_view_all" ON suppliers
FOR SELECT USING (TRUE);

-- Suppliers can manage their own record
CREATE POLICY "suppliers_own_access" ON suppliers
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Admins can manage all suppliers
CREATE POLICY "suppliers_admin_access" ON suppliers
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- =============================================
-- 6. FIX DELIVERY_PROVIDERS TABLE RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "delivery_providers_block_anonymous" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_view_all" ON delivery_providers;

-- Anyone can view approved delivery providers
CREATE POLICY "delivery_providers_view_approved" ON delivery_providers
FOR SELECT USING (status = 'approved' OR status = 'active');

-- Providers can manage their own record
CREATE POLICY "delivery_providers_self_access" ON delivery_providers
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Admins can manage all providers
CREATE POLICY "delivery_providers_admin_access" ON delivery_providers
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- =============================================
-- 7. FIX MONITORING_SERVICE_REQUESTS RLS POLICIES
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitoring_service_requests') THEN
    DROP POLICY IF EXISTS "monitoring_requests_user_access" ON monitoring_service_requests;
    DROP POLICY IF EXISTS "monitoring_requests_admin_access" ON monitoring_service_requests;
    
    -- Users can manage their own monitoring requests
    EXECUTE 'CREATE POLICY "monitoring_requests_user_access" ON monitoring_service_requests
      FOR ALL TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()))';
    
    -- Admins can manage all monitoring requests
    EXECUTE 'CREATE POLICY "monitoring_requests_admin_access" ON monitoring_service_requests
      FOR ALL TO authenticated
      USING (public.is_admin_no_rls())
      WITH CHECK (public.is_admin_no_rls())';
  END IF;
END $$;

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_requests TO authenticated;
GRANT SELECT ON suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO authenticated;
GRANT SELECT ON delivery_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_providers TO authenticated;

-- Grant permissions for QR code tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_items') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON material_items TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_qr_codes') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON material_qr_codes TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitoring_service_requests') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_service_requests TO authenticated';
  END IF;
END $$;

-- =============================================
-- Done! Purchase flow RLS policies are now fixed.
-- =============================================
