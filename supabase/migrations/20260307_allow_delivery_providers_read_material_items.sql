-- ============================================================
-- ALLOW DELIVERY PROVIDERS TO READ MATERIAL_ITEMS
-- ============================================================
-- Issue: Delivery providers cannot read material_items when scanning QR codes
-- for delivery confirmation because RLS blocks access.
--
-- Solution: Add RLS policy allowing delivery providers to read material_items
-- for purchase_orders that are assigned to them via delivery_requests.
-- ============================================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Delivery providers can view assigned material items" ON material_items;

-- Create policy: Delivery providers can view material_items for orders assigned to them
CREATE POLICY "Delivery providers can view assigned material items"
ON material_items
FOR SELECT
USING (
  -- Check if user is a delivery provider
  EXISTS (
    SELECT 1
    FROM delivery_providers dp
    JOIN profiles p ON dp.user_id = p.id
    WHERE p.user_id = auth.uid()
  )
  AND
  -- Check if the material_item belongs to a purchase_order assigned to this provider
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    JOIN profiles p ON dp.user_id = p.id
    WHERE po.id = material_items.purchase_order_id
    AND p.user_id = auth.uid()
    AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  )
);

-- Also allow UPDATE for delivery providers to mark items as received
DROP POLICY IF EXISTS "Delivery providers can update assigned material items" ON material_items;

CREATE POLICY "Delivery providers can update assigned material items"
ON material_items
FOR UPDATE
USING (
  -- Check if user is a delivery provider
  EXISTS (
    SELECT 1
    FROM delivery_providers dp
    JOIN profiles p ON dp.user_id = p.id
    WHERE p.user_id = auth.uid()
  )
  AND
  -- Check if the material_item belongs to a purchase_order assigned to this provider
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    JOIN profiles p ON dp.user_id = p.id
    WHERE po.id = material_items.purchase_order_id
    AND p.user_id = auth.uid()
    AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  )
)
WITH CHECK (
  -- Same check for WITH CHECK
  EXISTS (
    SELECT 1
    FROM delivery_providers dp
    JOIN profiles p ON dp.user_id = p.id
    WHERE p.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    JOIN profiles p ON dp.user_id = p.id
    WHERE po.id = material_items.purchase_order_id
    AND p.user_id = auth.uid()
    AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  )
);

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING clause present'
        ELSE 'No USING clause'
    END as has_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK clause present'
        ELSE 'No WITH CHECK clause'
    END as has_with_check
FROM pg_policies 
WHERE tablename = 'material_items'
AND policyname LIKE '%delivery%'
ORDER BY policyname;
