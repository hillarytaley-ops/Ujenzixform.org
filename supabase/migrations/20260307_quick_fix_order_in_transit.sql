-- ============================================================
-- Quick Fix: Move Scanned Order from In Transit to Delivered
-- Created: March 7, 2026
-- 
-- Run this SQL directly in Supabase SQL Editor to immediately fix
-- the order QR-1772673713715-XJ0LD (or any order that's scanned but still in transit)
-- ============================================================

-- Method 1: Fix by purchase_order po_number/order_number
UPDATE delivery_requests dr
SET 
  status = 'delivered',
  delivered_at = COALESCE(dr.delivered_at, NOW()),
  completed_at = COALESCE(dr.completed_at, NOW()),
  updated_at = NOW()
FROM purchase_orders po
WHERE dr.purchase_order_id = po.id
  AND (po.po_number LIKE '%1772673713715%' OR dr.order_number LIKE '%1772673713715%')
  AND dr.status NOT IN ('delivered', 'completed', 'cancelled');

-- Method 2: Fix by checking if all items are scanned
UPDATE delivery_requests dr
SET 
  status = 'delivered',
  delivered_at = COALESCE(dr.delivered_at, NOW()),
  completed_at = COALESCE(dr.completed_at, NOW()),
  updated_at = NOW()
WHERE dr.purchase_order_id IN (
  SELECT po.id
  FROM purchase_orders po
  WHERE (po.po_number LIKE '%1772673713715%' OR EXISTS (
    SELECT 1 FROM delivery_requests dr2 
    WHERE dr2.purchase_order_id = po.id 
    AND dr2.order_number LIKE '%1772673713715%'
  ))
  AND EXISTS (
    SELECT 1 FROM material_items mi
    WHERE mi.purchase_order_id = po.id
      AND mi.receive_scanned = TRUE
  )
  AND NOT EXISTS (
    SELECT 1 FROM material_items mi
    WHERE mi.purchase_order_id = po.id
      AND (mi.receive_scanned = FALSE OR mi.receive_scanned IS NULL)
  )
)
AND dr.status NOT IN ('delivered', 'completed', 'cancelled');

-- Method 3: Fix ALL orders where purchase_order status is 'delivered' but delivery_request is not
UPDATE delivery_requests dr
SET 
  status = 'delivered',
  delivered_at = COALESCE(dr.delivered_at, po.updated_at, NOW()),
  completed_at = COALESCE(dr.completed_at, po.updated_at, NOW()),
  updated_at = NOW()
FROM purchase_orders po
WHERE dr.purchase_order_id = po.id
  AND po.status IN ('delivered', 'completed')
  AND dr.status NOT IN ('delivered', 'completed', 'cancelled');

-- Verify the fix
SELECT 
  dr.id as delivery_request_id,
  dr.status as delivery_request_status,
  dr.order_number,
  po.id as purchase_order_id,
  po.status as purchase_order_status,
  po.po_number,
  COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) as items_scanned,
  COUNT(mi.id) as total_items
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.order_number LIKE '%1772673713715%' 
   OR po.po_number LIKE '%1772673713715%'
GROUP BY dr.id, dr.status, dr.order_number, po.id, po.status, po.po_number;
