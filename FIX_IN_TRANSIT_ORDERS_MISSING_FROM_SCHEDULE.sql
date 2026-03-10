-- ============================================================
-- IMMEDIATE FIX: Link In Transit orders to delivery providers
-- Run this in Supabase SQL Editor to fix orders that are In Transit
-- but not showing in delivery provider schedule
-- ============================================================

-- Step 1: Find orders that are In Transit (all items dispatched) but missing delivery_provider_id
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.delivery_provider_id as po_provider_id,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'ALL DISPATCHED - IN TRANSIT' 
    ELSE 'NOT ALL DISPATCHED' 
  END as status_check
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.status IN ('shipped', 'dispatched', 'in_transit')
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id)
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, dr.id, dr.provider_id, dr.status
HAVING COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0
ORDER BY po.created_at DESC;

-- Step 2: Fix orders - set delivery_provider_id from delivery_requests
UPDATE purchase_orders po
SET 
  delivery_provider_id = dr.provider_id,
  delivery_status = CASE 
    WHEN dr.status = 'accepted' THEN 'in_transit'
    ELSE 'dispatched'
  END,
  updated_at = NOW()
FROM delivery_requests dr
WHERE dr.purchase_order_id = po.id
  AND dr.provider_id IS NOT NULL
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id)
  AND po.id IN (
    SELECT purchase_order_id
    FROM material_items
    GROUP BY purchase_order_id
    HAVING COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) = COUNT(*) AND COUNT(*) > 0
  );

-- Step 3: Verify the fix
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.delivery_provider_id,
  po.delivery_status,
  dr.provider_id as dr_provider_id,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.status IN ('shipped', 'dispatched', 'in_transit')
  AND po.delivery_provider_id IS NOT NULL
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, po.delivery_status, dr.provider_id
HAVING COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0
ORDER BY po.updated_at DESC
LIMIT 10;
