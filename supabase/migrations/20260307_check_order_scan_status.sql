-- ============================================================
-- Check Scan Status for Order QR-1772673713715-XJ0LD
-- Created: March 7, 2026
-- 
-- Run this SQL to check if all items for the order are scanned
-- ============================================================

-- Check material_items scan status for the order
SELECT 
  po.id as purchase_order_id,
  po.po_number,
  po.status as po_status,
  dr.id as delivery_request_id,
  dr.order_number,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(mi.id) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) as received_items,
  COUNT(mi.id) FILTER (WHERE mi.dispatch_scanned = FALSE OR mi.dispatch_scanned IS NULL) as not_dispatched,
  COUNT(mi.id) FILTER (WHERE mi.receive_scanned = FALSE OR mi.receive_scanned IS NULL) as not_received,
  CASE 
    WHEN COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 THEN 'delivered'
    WHEN COUNT(mi.id) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
         AND COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) > 0 THEN 'in_transit'
    WHEN COUNT(mi.id) FILTER (WHERE mi.dispatch_scanned = TRUE) > 0 THEN 'in_transit'
    ELSE 'scheduled'
  END as expected_category
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number LIKE '%1772673713715%' 
   OR dr.order_number LIKE '%1772673713715%'
GROUP BY po.id, po.po_number, po.status, dr.id, dr.order_number, dr.status;

-- Show individual items for the order
SELECT 
  mi.id,
  mi.qr_code,
  mi.material_type,
  mi.dispatch_scanned,
  mi.dispatch_scanned_at,
  mi.receive_scanned,
  mi.receive_scanned_at,
  mi.status
FROM material_items mi
INNER JOIN purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE (po.po_number LIKE '%1772673713715%' OR dr.order_number LIKE '%1772673713715%')
ORDER BY mi.item_sequence;
