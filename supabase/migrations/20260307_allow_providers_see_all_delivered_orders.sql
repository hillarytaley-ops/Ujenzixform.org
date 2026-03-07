-- ============================================================
-- ALLOW DELIVERY PROVIDERS TO SEE ALL DELIVERED ORDERS
-- ============================================================
-- Issue: Delivery providers can only see material_items for orders assigned to them.
-- This prevents them from seeing all delivered orders in their history, even if they delivered them.
--
-- Solution: Update RLS policy to also allow providers to see material_items for
-- delivered orders (where all items are receive_scanned = true), regardless of assignment.
-- This matches the supplier dashboard behavior where all delivered orders are visible.
-- ============================================================

-- Update the SELECT policy to also allow access to delivered orders
DROP POLICY IF EXISTS "Delivery providers can view assigned material items" ON material_items;

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
  OR
  -- Method 4: NEW - Allow access to delivered orders where provider is involved
  -- This ensures providers can see delivered orders in their history, matching supplier dashboard
  -- But only for orders where they are the assigned provider (via delivery_requests or purchase_orders)
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = material_items.purchase_order_id
    AND (
      -- Order is marked as delivered
      po.status IN ('delivered', 'completed')
      OR
      -- OR all items for this order are received (delivered)
      (
        SELECT COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
        FROM material_items mi
        WHERE mi.purchase_order_id = po.id
      ) = TRUE
    )
    -- Only allow if provider is assigned to this delivery (via delivery_requests or purchase_orders)
    AND (
      -- Check via delivery_requests.provider_id
      EXISTS (
        SELECT 1
        FROM delivery_requests dr
        WHERE dr.purchase_order_id = po.id
        AND (
          -- Provider is assigned via delivery_providers table
          EXISTS (
            SELECT 1
            FROM delivery_providers dp
            WHERE dp.id = dr.provider_id
            AND dp.user_id = auth.uid()
          )
          OR
          -- OR provider_id directly matches auth.uid() (legacy)
          dr.provider_id = auth.uid()
        )
      )
      OR
      -- OR check via purchase_orders.delivery_provider_id
      EXISTS (
        SELECT 1
        FROM delivery_providers dp
        WHERE dp.id = po.delivery_provider_id
        AND dp.user_id = auth.uid()
      )
    )
  )
);

-- Verify the policy was updated
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING clause present'
        ELSE 'No USING clause'
    END as has_using
FROM pg_policies 
WHERE tablename = 'material_items'
AND policyname = 'Delivery providers can view assigned material items';
