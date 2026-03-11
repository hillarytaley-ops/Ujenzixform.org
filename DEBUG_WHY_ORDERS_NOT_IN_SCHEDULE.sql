-- ============================================================
-- DEBUG: Why orders are not appearing in schedule
-- ============================================================

-- Step 1: Check the orders and their status
SELECT 
  'Order Status' as section,
  po.po_number,
  po.id as purchase_order_id,
  po.status as po_status,
  po.delivery_provider_id,
  dr.id as delivery_request_id,
  dr.status as dr_status,
  dr.provider_id as dr_provider_id
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 2: Check material items for these orders
SELECT 
  'Material Items' as section,
  mi.purchase_order_id,
  po.po_number,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched_count,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received_count,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = false) as not_dispatched_count
FROM material_items mi
JOIN purchase_orders po ON po.id = mi.purchase_order_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
GROUP BY mi.purchase_order_id, po.po_number;

-- Step 3: Check what the RPC function returns for your user
-- This simulates what get_deliveries_for_provider_unified() would return
SELECT 
  'RPC Function Result' as section,
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'_categorized_status' as categorized_status,
  result->>'_items_count' as items_count,
  result->>'_dispatched_count' as dispatched_count,
  result->>'_received_count' as received_count,
  result->>'status' as status,
  result->>'po_status' as po_status
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'po_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
   OR result->>'order_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 4: Check your provider ID resolution
SELECT 
  'Provider ID Resolution' as section,
  auth.uid() as current_user_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as provider_id_from_user_id,
  (SELECT id FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956' LIMIT 1) as target_provider_id,
  (SELECT user_id FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956' LIMIT 1) as target_provider_user_id,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid
    THEN '✅ Provider ID matches'
    ELSE '❌ Provider ID does not match'
  END as match_status;

-- Step 5: Check if orders would be filtered out
SELECT 
  'Filter Check' as section,
  po.po_number,
  po.status as po_status,
  CASE
    WHEN po.status IN ('cancelled', 'rejected', 'quote_rejected') THEN '❌ FILTERED OUT - Bad status'
    ELSE '✅ Would pass status filter'
  END as status_filter,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr 
        WHERE dr.purchase_order_id = po.id 
          AND dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      )
    THEN '✅ Would match provider filter'
    ELSE '❌ FILTERED OUT - Provider mismatch'
  END as provider_filter
FROM purchase_orders po
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
