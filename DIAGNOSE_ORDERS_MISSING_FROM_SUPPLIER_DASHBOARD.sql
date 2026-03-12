-- ===================================================================
-- DIAGNOSE: Why orders assigned to delivery providers don't appear on supplier dashboard
-- ===================================================================
-- 
-- SCENARIOS WHERE ORDER CAN BE ASSIGNED TO DELIVERY PROVIDER BUT NOT SHOW ON SUPPLIER DASHBOARD:
--
-- 1. ❌ NO po_number: purchase_orders.po_number is NULL/empty
--    → Supplier dashboard filters out (line 985-988 in EnhancedQRCodeManager.tsx)
--    → But delivery_requests can still exist with purchase_order_id
--
-- 2. ❌ NO material_items: Order has no material_items
--    → Supplier dashboard groups by material_items (line 848-898)
--    → If no material_items, order won't appear
--    → But delivery_requests can still exist
--
-- 3. ❌ WRONG supplier_id: material_items.supplier_id doesn't match logged-in supplier
--    → Supplier dashboard filters by supplier_id (line 530, 719)
--    → Order won't appear on that supplier's dashboard
--    → But delivery_requests can still exist
--
-- 4. ❌ material_items created AFTER delivery_requests
--    → delivery_requests created first (order exists)
--    → material_items created later (supplier dashboard needs these)
--    → Order won't show until material_items exist
--
-- ===================================================================

-- Step 1: Find orders assigned to delivery providers but missing from supplier dashboard
SELECT 
  'Orders Assigned to Delivery Providers' as check_type,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT dr.purchase_order_id) as unique_purchase_orders,
  COUNT(DISTINCT dr.provider_id) as unique_providers
FROM delivery_requests dr
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND dr.purchase_order_id IS NOT NULL;

-- Step 2: Check Scenario 1 - Orders without po_number
SELECT 
  'Scenario 1: Orders WITHOUT po_number' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  COUNT(DISTINCT dr.id) as delivery_requests_count,
  COUNT(DISTINCT mi.id) as material_items_count,
  CASE 
    WHEN po.po_number IS NULL OR po.po_number = '' THEN '❌ NO po_number - WILL NOT APPEAR ON SUPPLIER DASHBOARD'
    ELSE '✅ HAS po_number'
  END as visibility_status
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND (po.po_number IS NULL OR po.po_number = '')
GROUP BY po.id, po.po_number, po.supplier_id
ORDER BY delivery_requests_count DESC
LIMIT 20;

-- Step 3: Check Scenario 2 - Orders without material_items
SELECT 
  'Scenario 2: Orders WITHOUT material_items' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  COUNT(DISTINCT dr.id) as delivery_requests_count,
  COUNT(DISTINCT mi.id) as material_items_count,
  CASE 
    WHEN COUNT(DISTINCT mi.id) = 0 THEN '❌ NO material_items - WILL NOT APPEAR ON SUPPLIER DASHBOARD'
    ELSE '✅ HAS material_items'
  END as visibility_status
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
GROUP BY po.id, po.po_number, po.supplier_id
HAVING COUNT(DISTINCT mi.id) = 0
ORDER BY delivery_requests_count DESC
LIMIT 20;

-- Step 4: Check Scenario 3 - Orders with material_items but wrong supplier_id
SELECT 
  'Scenario 3: Orders with WRONG supplier_id in material_items' as check_type,
  po.id,
  po.po_number,
  po.supplier_id as po_supplier_id,
  COUNT(DISTINCT dr.id) as delivery_requests_count,
  COUNT(DISTINCT mi.id) as total_material_items,
  COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) as items_with_matching_supplier_id,
  COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id != po.supplier_id OR mi.supplier_id IS NULL) as items_with_wrong_supplier_id,
  array_agg(DISTINCT mi.supplier_id) as material_items_supplier_ids,
  CASE 
    WHEN COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 
     AND COUNT(DISTINCT mi.id) > 0
    THEN '❌ NO MATCHING supplier_id - WILL NOT APPEAR ON SUPPLIER DASHBOARD'
    WHEN COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) > 0
    THEN '✅ HAS MATCHING supplier_id'
    ELSE '⚠️ NO material_items'
  END as visibility_status
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND po.supplier_id IS NOT NULL
GROUP BY po.id, po.po_number, po.supplier_id
HAVING COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0
   AND COUNT(DISTINCT mi.id) > 0
ORDER BY delivery_requests_count DESC
LIMIT 20;

-- Step 5: Check Scenario 4 - Orders where delivery_requests created before material_items
SELECT 
  'Scenario 4: delivery_requests created BEFORE material_items' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  MIN(dr.created_at) as first_delivery_request_created_at,
  MIN(mi.created_at) as first_material_item_created_at,
  CASE 
    WHEN MIN(dr.created_at) < MIN(mi.created_at) THEN '❌ delivery_requests created FIRST - Order may not appear until material_items exist'
    WHEN MIN(mi.created_at) IS NULL THEN '❌ NO material_items - WILL NOT APPEAR'
    ELSE '✅ material_items created first or same time'
  END as timing_status
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
GROUP BY po.id, po.po_number, po.supplier_id
HAVING MIN(dr.created_at) < COALESCE(MIN(mi.created_at), '9999-12-31'::timestamp)
ORDER BY first_delivery_request_created_at DESC
LIMIT 20;

-- Step 6: Comprehensive summary of all problematic orders
SELECT 
  'COMPREHENSIVE SUMMARY' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  COUNT(DISTINCT dr.id) as delivery_requests_count,
  COUNT(DISTINCT mi.id) as material_items_count,
  COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) as items_with_matching_supplier_id,
  CASE 
    WHEN po.po_number IS NULL OR po.po_number = '' THEN '❌ Missing po_number'
    WHEN COUNT(DISTINCT mi.id) = 0 THEN '❌ No material_items'
    WHEN COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 
     AND COUNT(DISTINCT mi.id) > 0 THEN '❌ Wrong supplier_id in material_items'
    ELSE '✅ Should appear on supplier dashboard'
  END as issue_type,
  CASE 
    WHEN po.po_number IS NULL OR po.po_number = '' THEN 'WILL NOT APPEAR - Missing po_number'
    WHEN COUNT(DISTINCT mi.id) = 0 THEN 'WILL NOT APPEAR - No material_items'
    WHEN COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 
     AND COUNT(DISTINCT mi.id) > 0 THEN 'WILL NOT APPEAR - Wrong supplier_id'
    ELSE 'SHOULD APPEAR'
  END as visibility_status
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
GROUP BY po.id, po.po_number, po.supplier_id
HAVING 
  (po.po_number IS NULL OR po.po_number = '')
  OR COUNT(DISTINCT mi.id) = 0
  OR (COUNT(DISTINCT mi.id) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 
      AND COUNT(DISTINCT mi.id) > 0)
ORDER BY delivery_requests_count DESC
LIMIT 50;
