-- ============================================================
-- DIAGNOSE: Why scheduled orders are missing after refresh
-- ============================================================

-- Step 1: Check what the RPC function returns for your provider
-- This is what the dashboard uses
SELECT 
  'RPC Function Results' as section,
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'_categorized_status' as categorized_status,
  result->>'status' as status,
  result->>'po_status' as po_status,
  result->>'_items_count' as items_count,
  result->>'_dispatched_count' as dispatched_count,
  result->>'_received_count' as received_count,
  result->>'delivery_provider_id' as delivery_provider_id,
  result->>'provider_id' as provider_id
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'_categorized_status' = 'scheduled'
ORDER BY result->>'updated_at' DESC NULLS LAST
LIMIT 20;

-- Step 2: Count orders by category
SELECT 
  'Order Counts by Category' as section,
  result->>'_categorized_status' as category,
  COUNT(*) as count
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
GROUP BY result->>'_categorized_status'
ORDER BY count DESC;

-- Step 3: Check your provider ID resolution
SELECT 
  'Provider ID Resolution' as section,
  auth.uid() as your_auth_uid,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as provider_id_from_rpc,
  (SELECT COUNT(*) FROM delivery_providers WHERE user_id = auth.uid()) as provider_count,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) IS NOT NULL
    THEN '✅ Provider ID found'
    ELSE '❌ Provider ID NOT found - This is the problem!'
  END as status;

-- Step 4: Check orders that should be in schedule but might not be
SELECT 
  'Orders That Should Be Scheduled' as section,
  po.po_number,
  po.status as po_status,
  po.delivery_provider_id,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received_items,
  CASE
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) = COUNT(mi.id) 
      AND COUNT(*) FILTER (WHERE mi.receive_scanned = true) < COUNT(mi.id)
      AND COUNT(mi.id) > 0
    THEN '✅ Should be in scheduled (all dispatched, not all received)'
    WHEN dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      AND dr.status IN ('accepted', 'assigned', 'in_transit')
    THEN '✅ Should be in scheduled (delivery request accepted)'
    ELSE '❓ Check manually'
  END as should_appear
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE (
  po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
  OR dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, dr.id, dr.provider_id, dr.status
HAVING COUNT(mi.id) > 0
ORDER BY po.created_at DESC
LIMIT 20;

-- Step 5: Check if orders are being filtered out by the RPC function
SELECT 
  'RPC Function Filter Check' as section,
  po.po_number,
  po.delivery_provider_id as po_provider_id,
  dr.provider_id as dr_provider_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as your_provider_id,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      OR dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
    THEN '✅ Should pass RPC filter'
    ELSE '❌ Will be filtered out by RPC'
  END as rpc_filter_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS r
      WHERE r->>'po_number' = po.po_number
    )
    THEN '✅ Appears in RPC result'
    ELSE '❌ NOT in RPC result'
  END as in_rpc_result
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE (
  po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
  OR dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')
ORDER BY po.created_at DESC
LIMIT 20;
