-- ============================================================
-- DEBUG: Check why orders aren't moving to Delivered after scan
-- Run this to see the current state of orders and material_items
-- ============================================================

-- Step 1: Check specific order (replace with your order ID)
SELECT 
  po.id,
  po.po_number,
  po.status as po_status,
  po.delivery_status,
  dr.id as delivery_request_id,
  dr.status as dr_status,
  dr.provider_id,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) as received_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE AND mi.receive_scanned = TRUE) as completed_items,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'ALL RECEIVED - SHOULD BE DELIVERED' 
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'ALL DISPATCHED - IN TRANSIT' 
    ELSE 'PARTIAL' 
  END as status_check
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  OR po.id IN (
    SELECT purchase_order_id FROM material_items 
    WHERE qr_code LIKE '%PO-1772597930676-IATLA%' OR qr_code LIKE '%QR-1772324057410-ROZCS%'
  )
GROUP BY po.id, po.po_number, po.status, po.delivery_status, dr.id, dr.status, dr.provider_id;

-- Step 2: Check material_items for these orders
SELECT 
  mi.id,
  mi.qr_code,
  mi.purchase_order_id,
  mi.material_type,
  mi.dispatch_scanned,
  mi.receive_scanned,
  mi.status,
  mi.is_invalidated,
  po.po_number
FROM material_items mi
JOIN purchase_orders po ON po.id = mi.purchase_order_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
ORDER BY po.po_number, mi.item_sequence;

-- Step 3: Check recent scan events
SELECT 
  qse.id,
  qse.qr_code,
  qse.scan_type,
  qse.scanned_at,
  mi.purchase_order_id,
  po.po_number,
  mi.receive_scanned,
  mi.dispatch_scanned
FROM qr_scan_events qse
LEFT JOIN material_items mi ON mi.qr_code = qse.qr_code
LEFT JOIN purchase_orders po ON po.id = mi.purchase_order_id
WHERE qse.scanned_at > NOW() - INTERVAL '1 hour'
  AND qse.scan_type = 'receiving'
ORDER BY qse.scanned_at DESC
LIMIT 20;

-- Step 4: Manually fix if needed (uncomment to run)
-- UPDATE purchase_orders
-- SET status = 'delivered',
--     delivery_status = 'delivered',
--     updated_at = NOW()
-- WHERE id IN (
--   SELECT purchase_order_id
--   FROM material_items
--   GROUP BY purchase_order_id
--   HAVING COUNT(*) FILTER (WHERE receive_scanned = TRUE) = COUNT(*) AND COUNT(*) > 0
-- )
-- AND status != 'delivered';
