-- ============================================================
-- IMMEDIATE FIX: Run this in Supabase SQL Editor
-- This will fix all orders that should be "delivered" but aren't
-- ============================================================

-- Step 1: Check which orders have all items received but status is not delivered
SELECT 
  po.id,
  po.po_number,
  po.status as current_status,
  po.delivery_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) as received_items,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'SHOULD BE DELIVERED' 
    ELSE 'OK' 
  END as status_check
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.status != 'delivered'
GROUP BY po.id, po.po_number, po.status, po.delivery_status
HAVING COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0
ORDER BY po.created_at DESC;

-- Step 2: Fix all orders that should be delivered
UPDATE purchase_orders
SET 
  status = 'delivered',
  delivery_status = 'delivered',
  delivered_at = COALESCE(delivered_at, NOW()),
  updated_at = NOW()
WHERE id IN (
  SELECT po.id
  FROM purchase_orders po
  LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
  WHERE po.status != 'delivered'
  GROUP BY po.id
  HAVING COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) 
    AND COUNT(mi.id) > 0
);

-- Step 3: Also update delivery_requests
UPDATE delivery_requests
SET 
  status = 'delivered',
  delivered_at = COALESCE(delivered_at, NOW()),
  updated_at = NOW()
WHERE purchase_order_id IN (
  SELECT po.id
  FROM purchase_orders po
  LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
  WHERE po.status = 'delivered'
  GROUP BY po.id
  HAVING COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) 
    AND COUNT(mi.id) > 0
)
AND status NOT IN ('delivered', 'completed', 'cancelled');

-- Step 4: Verify the fix
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.delivery_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) as received_items
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.status = 'delivered'
GROUP BY po.id, po.po_number, po.status, po.delivery_status
ORDER BY po.updated_at DESC
LIMIT 10;
