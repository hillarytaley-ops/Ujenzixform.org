-- ===================================================================
-- CHECK: Why order QR-1773125455597-K3447 is not on supplier dashboard
-- ===================================================================

-- Step 1: Find the purchase_order for this order number
SELECT 
  'Purchase Order Info' as check_type,
  po.id,
  po.po_number,
  po.status,
  po.delivery_status,
  po.delivery_provider_id,
  po.delivery_provider_name,
  po.supplier_id,
  po.created_at,
  po.updated_at
FROM purchase_orders po
WHERE po.po_number = 'QR-1773125455597-K3447'
   OR po.id::text LIKE '%1773125455597%'
   OR po.po_number LIKE '%1773125455597%';

-- Step 2: Check the delivery_request for this order
SELECT 
  'Delivery Request Info' as check_type,
  dr.id,
  dr.status,
  dr.provider_id,
  dr.purchase_order_id,
  dr.order_number,
  dr.accepted_at,
  dr.created_at,
  dr.updated_at
FROM delivery_requests dr
WHERE dr.order_number LIKE '%1773125455597%'
   OR dr.purchase_order_id IN (
     SELECT id FROM purchase_orders 
     WHERE po_number = 'QR-1773125455597-K3447'
   );

-- Step 3: Check if trigger updated purchase_orders correctly
SELECT 
  'Trigger Check' as check_type,
  po.id,
  po.po_number,
  po.status as po_status,
  po.delivery_status,
  po.delivery_provider_id,
  dr.status as dr_status,
  dr.provider_id as dr_provider_id,
  CASE 
    WHEN po.delivery_provider_id = dr.provider_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as provider_match,
  CASE 
    WHEN dr.status = 'accepted' AND po.delivery_provider_id IS NOT NULL THEN '✅ TRIGGER WORKED'
    WHEN dr.status = 'accepted' AND po.delivery_provider_id IS NULL THEN '❌ TRIGGER FAILED'
    ELSE '⚠️ NOT ACCEPTED YET'
  END as trigger_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
   OR dr.order_number LIKE '%1773125455597%';

-- Step 4: Check material_items scan status (supplier dashboard uses this)
SELECT 
  'Material Items Status' as check_type,
  mi.purchase_order_id,
  COUNT(*) as total_items,
  COUNT(DISTINCT mi.supplier_id) as unique_supplier_ids,
  array_agg(DISTINCT mi.supplier_id) as supplier_ids,
  po.supplier_id as po_supplier_id,
  COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) as items_with_matching_supplier_id,
  COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) as dispatched_count,
  COUNT(*) FILTER (WHERE receive_scanned = TRUE) as received_count,
  CASE 
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) 
     AND COUNT(*) > COUNT(*) FILTER (WHERE receive_scanned = TRUE) 
    THEN 'In Transit'
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE) 
    THEN 'Delivered'
    WHEN COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) = 0 
    THEN 'Awaiting Dispatch'
    ELSE 'Partially Dispatched'
  END as expected_category,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 
    THEN '❌ NO ITEMS WITH MATCHING SUPPLIER_ID - WILL NOT APPEAR'
    WHEN COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) > 0 
    THEN '✅ HAS ITEMS WITH MATCHING SUPPLIER_ID - WILL APPEAR'
    ELSE '⚠️ UNKNOWN'
  END as supplier_match_status
FROM material_items mi
INNER JOIN purchase_orders po ON mi.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
   OR po.po_number LIKE '%1773125455597%'
GROUP BY mi.purchase_order_id, po.supplier_id;

-- Step 5: Check what supplier dashboard should show
SELECT 
  'Supplier Dashboard Filter Check' as check_type,
  po.po_number,
  po.status,
  po.delivery_status,
  CASE 
    WHEN po.status IN ('quote_created', 'quote_received_by_supplier', 'quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quote_accepted', 'quote_rejected', 'pending', 'quoted', 'rejected', 'confirmed') 
    THEN '✅ WILL APPEAR IN QUOTES TAB'
    ELSE '❌ WILL NOT APPEAR IN QUOTES TAB'
  END as quotes_tab,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM material_items mi 
      WHERE mi.purchase_order_id = po.id 
        AND mi.dispatch_scanned = FALSE
    ) 
    THEN '✅ WILL APPEAR IN AWAITING DISPATCH'
    ELSE '❌ WILL NOT APPEAR IN AWAITING DISPATCH'
  END as awaiting_dispatch_tab,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM material_items mi 
      WHERE mi.purchase_order_id = po.id 
        AND mi.dispatch_scanned = TRUE 
        AND mi.receive_scanned = FALSE
    ) 
    THEN '✅ WILL APPEAR IN IN TRANSIT'
    ELSE '❌ WILL NOT APPEAR IN IN TRANSIT'
  END as in_transit_tab,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM material_items mi 
      WHERE mi.purchase_order_id = po.id 
        AND mi.receive_scanned = TRUE
    ) 
     AND NOT EXISTS (
      SELECT 1 FROM material_items mi 
      WHERE mi.purchase_order_id = po.id 
        AND mi.receive_scanned = FALSE
    )
    THEN '✅ WILL APPEAR IN DELIVERED'
    ELSE '❌ WILL NOT APPEAR IN DELIVERED'
  END as delivered_tab
FROM purchase_orders po
WHERE po.po_number = 'QR-1773125455597-K3447';
