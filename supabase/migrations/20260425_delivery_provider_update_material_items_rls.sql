-- ============================================================
-- Delivery providers: allow UPDATE on material_items for assigned orders
-- Receiving scanner uses REST PATCH (no RPC). This policy must allow
-- providers to update receive_scanned, status, etc. for their orders.
-- provider_id can be auth.uid() OR delivery_providers.id; we cover both.
-- Created: April 25, 2026
-- ============================================================

DROP POLICY IF EXISTS "Delivery providers can update assigned material items" ON material_items;

CREATE POLICY "Delivery providers can update assigned material items"
ON material_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND (
      po.delivery_provider_id = auth.uid()
      OR dr.provider_id = auth.uid()
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND (
      po.delivery_provider_id = auth.uid()
      OR dr.provider_id = auth.uid()
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid())
    )
  )
);

COMMENT ON POLICY "Delivery providers can update assigned material items" ON material_items IS
  'Allows delivery providers to PATCH material_items (receive scan) for orders assigned to them. Required for REST-based receiving scanner.';
