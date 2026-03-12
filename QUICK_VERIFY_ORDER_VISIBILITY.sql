-- ===================================================================
-- QUICK VERIFY: Check if order QR-1773125455597-K3447 will appear on supplier dashboard
-- ===================================================================

-- Step 1: Check purchase_order supplier_id
SELECT 
  'Purchase Order' as check_type,
  po.id,
  po.po_number,
  po.supplier_id as po_supplier_id
FROM purchase_orders po
WHERE po.po_number = 'QR-1773125455597-K3447';

-- Step 2: Check material_items supplier_id matching
SELECT 
  'Material Items Supplier ID Check' as check_type,
  mi.purchase_order_id,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) as items_with_matching_supplier_id,
  COUNT(*) FILTER (WHERE mi.supplier_id IS NULL) as items_with_null_supplier_id,
  COUNT(*) FILTER (WHERE mi.supplier_id != po.supplier_id) as items_with_mismatched_supplier_id,
  po.supplier_id as po_supplier_id,
  array_agg(DISTINCT mi.supplier_id) as material_items_supplier_ids,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO MATERIAL_ITEMS - WILL NOT APPEAR'
    WHEN COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 THEN '❌ NO MATCHING SUPPLIER_ID - WILL NOT APPEAR'
    WHEN COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) > 0 THEN '✅ HAS MATCHING SUPPLIER_ID - WILL APPEAR'
    ELSE '⚠️ UNKNOWN'
  END as visibility_status
FROM material_items mi
INNER JOIN purchase_orders po ON mi.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
GROUP BY mi.purchase_order_id, po.supplier_id;

-- Step 3: Check dispatch status (should be in "Awaiting Dispatch" tab)
SELECT 
  'Dispatch Status Check' as check_type,
  po.po_number,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_count,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) as awaiting_dispatch_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) > 0 THEN '✅ WILL APPEAR IN AWAITING DISPATCH TAB'
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) > 0 
     AND COUNT(*) FILTER (WHERE mi.receive_scanned = FALSE) > 0 
    THEN '✅ WILL APPEAR IN DISPATCHED/IN TRANSIT TAB'
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(*) 
    THEN '✅ WILL APPEAR IN DELIVERED TAB'
    ELSE '⚠️ UNKNOWN STATUS'
  END as expected_tab
FROM purchase_orders po
INNER JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
GROUP BY po.po_number;
