-- ============================================================
-- FIND: Why 41 orders are missing from RPC function
-- You see 100 initially, but RPC only returns 59
-- ============================================================

-- Step 1: Count orders from delivery_requests (what shows 100 initially)
SELECT 
  'Step 1: Orders from delivery_requests' as section,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT dr.purchase_order_id) as unique_purchase_orders,
  COUNT(DISTINCT CASE WHEN dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN dr.id END) as with_your_provider_id,
  COUNT(DISTINCT CASE WHEN dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived') THEN dr.id END) as active_status_count
FROM delivery_requests dr
WHERE dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  AND dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1);

-- Step 2: Count orders that RPC function would return
SELECT 
  'Step 2: Orders RPC Function Would Return' as section,
  COUNT(*) as total_in_rpc
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result;

-- Step 3: Find orders in delivery_requests but NOT in RPC result
SELECT 
  'Step 3: Missing Orders (in delivery_requests but not in RPC)' as section,
  dr.id as delivery_request_id,
  dr.purchase_order_id,
  po.po_number,
  dr.provider_id,
  dr.status as dr_status,
  po.status as po_status,
  po.delivery_provider_id,
  CASE
    WHEN po.status IN ('cancelled', 'rejected', 'quote_rejected', 'delivered') THEN '❌ Filtered by po.status'
    WHEN dr.status IN ('cancelled', 'completed', 'delivered') THEN '❌ Filtered by dr.status'
    WHEN po.delivery_provider_id IS NULL AND dr.provider_id IS NULL THEN '❌ Missing provider_id'
    WHEN po.delivery_provider_id != (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
      AND dr.provider_id != (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
    THEN '❌ Provider ID mismatch'
    WHEN NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS r
      WHERE r->>'purchase_order_id' = dr.purchase_order_id::text
         OR r->>'po_number' = po.po_number
    )
    THEN '❌ Not in RPC result'
    ELSE '✅ Should be in RPC'
  END as why_missing
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS r
    WHERE r->>'purchase_order_id' = dr.purchase_order_id::text
       OR (po.po_number IS NOT NULL AND r->>'po_number' = po.po_number)
  )
ORDER BY dr.created_at DESC
LIMIT 50;

-- Step 4: Check if orders are being filtered by purchase_orders status
SELECT 
  'Step 4: Orders Filtered by Status' as section,
  COUNT(*) as total_delivery_requests,
  COUNT(*) FILTER (WHERE po.status IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')) as filtered_by_po_status,
  COUNT(*) FILTER (WHERE po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')) as would_pass_po_filter,
  COUNT(*) FILTER (WHERE po.id IS NULL) as no_purchase_order
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived');
