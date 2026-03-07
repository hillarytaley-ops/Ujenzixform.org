-- ============================================================
-- ALLOW DELIVERY PROVIDERS TO READ MATERIAL_ITEMS
-- ============================================================
-- Issue: Delivery providers cannot read material_items when scanning QR codes
-- for delivery confirmation because RLS blocks access.
--
-- Solution: Add RLS policy allowing delivery providers to read material_items
-- for purchase_orders that are assigned to them via delivery_requests.
--
-- Note: delivery_providers.user_id directly references auth.users(id),
-- so we check dp.user_id = auth.uid() directly without joining profiles.
-- ============================================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Delivery providers can view assigned material items" ON material_items;

-- Create policy: Delivery providers can view material_items for orders assigned to them
-- This policy uses multiple checks to ensure delivery providers can access material_items:
-- 1. Via delivery_requests (primary method)
-- 2. Via purchase_orders.delivery_provider_id (fallback method)
-- 3. Handles cases where delivery_request might not exist or have NULL purchase_order_id
CREATE POLICY "Delivery providers can view assigned material items"
ON material_items
FOR SELECT
USING (
  -- Method 1: Check via delivery_requests (most common case)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
    AND (dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived', 'delivered', 'completed') OR dr.status IS NULL)
  )
  OR
  -- Method 2: Check via purchase_orders.delivery_provider_id (fallback)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_providers dp ON po.delivery_provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
  )
  OR
  -- Method 3: Direct check if provider_id in delivery_requests matches auth.uid() (for legacy data)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND dr.provider_id = auth.uid()
  )
);

-- Also allow UPDATE for delivery providers to mark items as received
DROP POLICY IF EXISTS "Delivery providers can update assigned material items" ON material_items;

CREATE POLICY "Delivery providers can update assigned material items"
ON material_items
FOR UPDATE
USING (
  -- Method 1: Check via delivery_requests (most common case)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
    AND (dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived', 'delivered', 'completed') OR dr.status IS NULL)
  )
  OR
  -- Method 2: Check via purchase_orders.delivery_provider_id (fallback)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_providers dp ON po.delivery_provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
  )
  OR
  -- Method 3: Direct check if provider_id in delivery_requests matches auth.uid() (for legacy data)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND dr.provider_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for WITH CHECK
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    JOIN delivery_providers dp ON dr.provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
    AND (dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived', 'delivered', 'completed') OR dr.status IS NULL)
  )
  OR
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_providers dp ON po.delivery_provider_id = dp.id
    WHERE po.id = material_items.purchase_order_id
    AND dp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND dr.provider_id = auth.uid()
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
