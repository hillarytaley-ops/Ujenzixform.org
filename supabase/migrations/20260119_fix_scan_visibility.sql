-- =====================================================================
-- FIX SCAN VISIBILITY FOR BUILDERS AND ADMIN
-- Ensures scan events are visible to:
-- 1. Admin - sees all scans
-- 2. Suppliers - sees scans for their materials
-- 3. Builders - sees scans for materials they ordered
-- =====================================================================

-- Drop existing policies on qr_scan_events
DROP POLICY IF EXISTS "Admin can view all scan events" ON public.qr_scan_events;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.qr_scan_events;
DROP POLICY IF EXISTS "Suppliers can view their scan events" ON public.qr_scan_events;
DROP POLICY IF EXISTS "Builders can view their scan events" ON public.qr_scan_events;
DROP POLICY IF EXISTS "scan_events_admin_select" ON public.qr_scan_events;
DROP POLICY IF EXISTS "scan_events_insert" ON public.qr_scan_events;
DROP POLICY IF EXISTS "scan_events_builder_select" ON public.qr_scan_events;
DROP POLICY IF EXISTS "scan_events_supplier_select" ON public.qr_scan_events;

-- 1. Admin can view ALL scan events
CREATE POLICY "scan_events_admin_all" ON public.qr_scan_events
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::app_role
    )
);

-- 2. Suppliers can view scan events for their materials
CREATE POLICY "scan_events_supplier_select" ON public.qr_scan_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM material_items mi
        WHERE mi.qr_code = qr_scan_events.qr_code
        AND mi.supplier_id = auth.uid()
    )
);

-- 3. Builders can view scan events for materials they ordered
CREATE POLICY "scan_events_builder_select" ON public.qr_scan_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM material_items mi
        JOIN purchase_orders po ON mi.purchase_order_id = po.id
        WHERE mi.qr_code = qr_scan_events.qr_code
        AND po.buyer_id = auth.uid()
    )
);

-- 4. Authenticated users can insert their own scans
CREATE POLICY "scan_events_insert" ON public.qr_scan_events
FOR INSERT TO authenticated
WITH CHECK (scanned_by = auth.uid() OR scanned_by IS NULL);

-- =====================================================================
-- ALSO FIX material_items visibility for builders
-- =====================================================================

DROP POLICY IF EXISTS "Builders can view their material items" ON public.material_items;
DROP POLICY IF EXISTS "material_items_builder_select" ON public.material_items;

-- Builders can view material items from their purchase orders
CREATE POLICY "material_items_builder_select" ON public.material_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = material_items.purchase_order_id
        AND po.buyer_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'supplier'::app_role)
    )
    OR
    supplier_id = auth.uid()
);

-- =====================================================================
-- FIX purchase_orders visibility for builders
-- =====================================================================

DROP POLICY IF EXISTS "Buyers can view their purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_buyer_select" ON public.purchase_orders;

-- Buyers can view their own purchase orders
CREATE POLICY "purchase_orders_buyer_select" ON public.purchase_orders
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR supplier_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::app_role
    )
);

-- =====================================================================
-- VERIFY: Show current policies
-- =====================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('qr_scan_events', 'material_items', 'purchase_orders')
ORDER BY tablename, policyname;

