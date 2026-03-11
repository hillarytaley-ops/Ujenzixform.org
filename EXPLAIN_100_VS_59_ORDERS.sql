-- ============================================================
-- EXPLAIN: Why 100 orders initially, but only 59 after refresh
-- ============================================================

-- ============================================================
-- UNDERSTANDING THE TWO DATA SOURCES:
-- ============================================================
-- 1. INITIAL LOAD (100 orders):
--    - Uses: useDeliveryProviderData hook
--    - Fetches from: delivery_requests table directly
--    - Filter: status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
--    - Provider match: dr.provider_id = your_provider_id
--    - NO filtering by purchase_orders.status
--
-- 2. AFTER REFRESH (59 orders):
--    - Uses: useDeliveriesUnified hook
--    - Fetches from: get_deliveries_for_provider_unified() RPC function
--    - Filter: dr.status NOT IN ('cancelled') AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected')
--    - Provider match: dr.provider_id = your_provider_id OR po.delivery_provider_id = your_provider_id
--    - EXCLUDES orders where purchase_orders.status is 'rejected' or 'quote_rejected'
-- ============================================================

-- Step 1: Count orders from delivery_requests (what shows 100 initially)
SELECT 
  'Step 1: Orders from delivery_requests (Initial Load - 100 orders)' as section,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT dr.purchase_order_id) as unique_purchase_orders,
  COUNT(DISTINCT CASE WHEN dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN dr.id END) as with_your_provider_id
FROM delivery_requests dr
WHERE dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  AND dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1);

-- Step 2: Count orders that RPC function returns (what shows 59 after refresh)
SELECT 
  'Step 2: Orders from RPC Function (After Refresh - 59 orders)' as section,
  COUNT(*) as total_in_rpc,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'in_transit') as in_transit_count,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'delivered') as delivered_count
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result;

-- Step 3: Find the 41 missing orders and WHY they're missing
SELECT 
  'Step 3: The 41 Missing Orders (100 - 59 = 41)' as section,
  dr.id as delivery_request_id,
  dr.purchase_order_id,
  po.po_number,
  dr.status as dr_status,
  po.status as po_status,
  dr.provider_id as dr_provider_id,
  po.delivery_provider_id as po_provider_id,
  CASE
    -- Check if purchase_order status is filtering it out
    WHEN po.status IN ('rejected', 'quote_rejected') THEN 
      '❌ FILTERED OUT: purchase_orders.status = ' || po.status || ' (RPC excludes rejected/quote_rejected)'
    WHEN po.status = 'cancelled' THEN 
      '❌ FILTERED OUT: purchase_orders.status = cancelled'
    -- Check if delivery_request status is filtering it out
    WHEN dr.status = 'cancelled' THEN 
      '❌ FILTERED OUT: delivery_requests.status = cancelled'
    -- Check if it's in RPC result but maybe categorized differently
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS r
      WHERE r->>'purchase_order_id' = dr.purchase_order_id::text
         OR (po.po_number IS NOT NULL AND r->>'po_number' = po.po_number)
    ) THEN 
      '✅ Actually in RPC (maybe different categorization)'
    -- Check provider ID mismatch
    WHEN po.delivery_provider_id IS NULL AND dr.provider_id != (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN 
      '❌ FILTERED OUT: Provider ID mismatch'
    ELSE 
      '❓ Unknown reason - needs investigation'
  END as why_missing,
  -- Show if purchase_order exists
  CASE WHEN po.id IS NULL THEN '⚠️ No purchase_order linked' ELSE '✅ Has purchase_order' END as has_purchase_order
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

-- Step 4: Summary by purchase_orders.status (the main culprit)
SELECT 
  'Step 4: Summary - Why Orders Are Missing' as section,
  po.status as purchase_order_status,
  COUNT(*) as count_of_missing_orders,
  STRING_AGG(DISTINCT dr.status, ', ') as delivery_request_statuses,
  CASE 
    WHEN po.status IN ('rejected', 'quote_rejected') THEN 
      '❌ These are filtered out by RPC function (po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected''))'
    WHEN po.status = 'cancelled' THEN 
      '❌ These are filtered out by RPC function (po.status = ''cancelled'')'
    ELSE 
      '❓ Other reason'
  END as explanation
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS r
    WHERE r->>'purchase_order_id' = dr.purchase_order_id::text
       OR (po.po_number IS NOT NULL AND r->>'po_number' = po.po_number)
  )
GROUP BY po.status
ORDER BY count_of_missing_orders DESC;

-- Step 5: Show the difference in filtering logic
SELECT 
  'Step 5: Filtering Logic Comparison' as section,
  'Initial Load (useDeliveryProviderData)' as source,
  'Filters: dr.status IN (accepted, assigned, picked_up, in_transit, dispatched, out_for_delivery, delivery_arrived)' as filter_logic,
  'NO filtering by purchase_orders.status' as purchase_order_filter,
  'Result: Shows ALL delivery_requests with active statuses' as result,
  '' as placeholder
UNION ALL
SELECT 
  'After Refresh (useDeliveriesUnified RPC)' as section,
  'After Refresh (useDeliveriesUnified RPC)' as source,
  'Filters: dr.status NOT IN (cancelled) AND po.status NOT IN (cancelled, rejected, quote_rejected)' as filter_logic,
  'EXCLUDES orders where purchase_orders.status is rejected or quote_rejected' as purchase_order_filter,
  'Result: Excludes 41 orders with rejected/quote_rejected purchase_orders' as result,
  '' as placeholder;

-- Step 6: The Solution
SELECT 
  'Step 6: The Solution' as section,
  'Remove restrictive filters from RPC function' as action,
  'Change: po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')' as old_filter,
  'To: po.status NOT IN (''cancelled'')' as new_filter,
  'Reason: rejected/quote_rejected are quote-related statuses, not delivery blockers' as reason,
  'Result: All 100 orders will appear consistently' as expected_result;
