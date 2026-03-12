-- ===================================================================
-- CHECK: Does order QR-1773125455597-K3447 exist in the database?
-- ===================================================================

-- Step 1: Check if purchase_order exists
SELECT 
  'Purchase Order Check' as check_type,
  po.id,
  po.po_number,
  po.status,
  po.delivery_status,
  po.supplier_id,
  po.delivery_provider_id,
  po.created_at
FROM purchase_orders po
WHERE po.po_number = 'QR-1773125455597-K3447'
   OR po.po_number LIKE '%1773125455597%';

-- Step 2: Check if delivery_request exists for this order
SELECT 
  'Delivery Request Check' as check_type,
  dr.id,
  dr.status,
  dr.provider_id,
  dr.purchase_order_id,
  dr.order_number,
  dr.created_at
FROM delivery_requests dr
WHERE dr.order_number LIKE '%1773125455597%'
   OR dr.purchase_order_id IN (
     SELECT id FROM purchase_orders 
     WHERE po_number = 'QR-1773125455597-K3447'
   );

-- Step 3: Check if material_items exist for this order
SELECT 
  'Material Items Check' as check_type,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) as dispatched_count,
  COUNT(*) FILTER (WHERE receive_scanned = TRUE) as received_count,
  COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as items_with_supplier_id
FROM material_items
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE po_number = 'QR-1773125455597-K3447'
);

-- Step 4: Check if order should appear on supplier dashboard (Awaiting Dispatch)
SELECT 
  'Supplier Dashboard Status' as check_type,
  po.po_number,
  po.status,
  COUNT(mi.id) as total_material_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) as awaiting_dispatch_count,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) > 0 THEN '✅ SHOULD APPEAR IN AWAITING DISPATCH'
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) > 0 
     AND COUNT(*) FILTER (WHERE mi.receive_scanned = FALSE) > 0 
    THEN '✅ SHOULD APPEAR IN DISPATCHED/IN TRANSIT'
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(*) 
    THEN '✅ SHOULD APPEAR IN DELIVERED'
    ELSE '❌ NO MATERIAL_ITEMS - WILL NOT APPEAR'
  END as supplier_dashboard_status
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
GROUP BY po.po_number, po.status;

-- Step 5: Check if order should be visible to delivery provider
SELECT 
  'Delivery Provider Visibility' as check_type,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as delivery_request_provider_id,
  dr.status as delivery_request_status,
  CASE 
    WHEN po.delivery_provider_id IS NOT NULL THEN '✅ ASSIGNED TO PROVIDER'
    WHEN dr.provider_id IS NOT NULL THEN '✅ LINKED VIA DELIVERY_REQUEST'
    ELSE '❌ NOT ASSIGNED TO ANY PROVIDER'
  END as provider_assignment,
  CASE 
    WHEN dr.status = 'accepted' THEN '✅ ACCEPTED - SHOULD APPEAR ON SCHEDULE'
    WHEN dr.status = 'pending' THEN '⚠️ PENDING - SHOULD APPEAR IN NOTIFICATIONS'
    WHEN dr.status = 'delivered' THEN '✅ DELIVERED - SHOULD APPEAR IN HISTORY'
    ELSE '⚠️ UNKNOWN STATUS'
  END as visibility_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447';
