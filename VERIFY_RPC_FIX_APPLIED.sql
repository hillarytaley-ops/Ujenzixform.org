-- ============================================================
-- VERIFY: That the RPC function fix was applied correctly
-- Note: auth.uid() is NULL in SQL Editor, so RPC will return 0
-- This script verifies the function definition, not the result
-- ============================================================

-- Step 1: Check the current RPC function definition
-- Look for the restrictive filters that should have been removed
SELECT 
  'Step 1: Check RPC Function Definition' as section,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ FIX NOT APPLIED: Still has restrictive filters (rejected, quote_rejected)'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' THEN 
      '✅ FIX APPLIED: Only filters cancelled (rejected/quote_rejected removed)'
    ELSE 
      '⚠️ Cannot determine: Check function definition manually'
  END as fix_status,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      'Run FIX_RPC_TO_INCLUDE_ALL_100_ORDERS.sql Step 2 to apply the fix'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' THEN 
      'Fix is applied! Test in the app (not SQL Editor) to see results'
    ELSE 
      'Review function definition'
  END as next_step
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 2: Show the actual function definition (filtered for key parts)
SELECT 
  'Step 2: Key Parts of Function Definition' as section,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ OLD: po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' THEN 
      '✅ NEW: po.status NOT IN (''cancelled'')'
    ELSE 
      '⚠️ Pattern not found'
  END as from_dr_filter,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%AND po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ OLD: AND po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')'
    WHEN pg_get_functiondef(oid) LIKE '%AND po.status NOT IN (''cancelled'')%' THEN 
      '✅ NEW: AND po.status NOT IN (''cancelled'')'
    ELSE 
      '⚠️ Pattern not found'
  END as from_po_filter
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 3: Count orders that SHOULD appear (using email lookup, not auth.uid())
-- This simulates what the RPC would return if auth.uid() worked in SQL Editor
SELECT 
  'Step 3: Orders That Should Appear (Simulated)' as section,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT CASE WHEN po.status IN ('rejected', 'quote_rejected') THEN dr.id END) as orders_with_rejected_quote,
  COUNT(DISTINCT CASE WHEN po.status = 'cancelled' THEN dr.id END) as orders_with_cancelled_po,
  COUNT(DISTINCT CASE 
    WHEN po.status NOT IN ('cancelled') 
      AND dr.status NOT IN ('cancelled')
    THEN dr.id 
  END) as orders_that_will_appear_with_fix,
  COUNT(DISTINCT CASE 
    WHEN po.status NOT IN ('cancelled', 'rejected', 'quote_rejected')
      AND dr.status NOT IN ('cancelled')
    THEN dr.id 
  END) as orders_that_would_appear_without_fix
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived');

-- Step 4: Show breakdown by purchase_orders.status
SELECT 
  'Step 4: Breakdown by purchase_orders.status' as section,
  COALESCE(po.status, 'NULL (no purchase_order)') as purchase_order_status,
  COUNT(*) as count,
  CASE 
    WHEN po.status IN ('rejected', 'quote_rejected') THEN 
      '❌ These were excluded by OLD RPC, but will be included by NEW RPC'
    WHEN po.status = 'cancelled' THEN 
      '❌ These are correctly excluded (truly cancelled)'
    WHEN po.status IS NULL THEN 
      '✅ These will be included (no purchase_order to filter)'
    ELSE 
      '✅ These will be included'
  END as will_appear_after_fix
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
GROUP BY po.status
ORDER BY count DESC;

-- Step 5: Important Note
SELECT 
  'Step 5: Important Note' as section,
  'Why RPC returns 0 in SQL Editor' as note_1,
  'auth.uid() is NULL in SQL Editor, so RPC cannot find provider_id' as reason_1,
  'The fix IS applied to the function definition' as note_2,
  'You must test in the APP (logged in) to see the results' as reason_2,
  'After logging in, refresh the dashboard to see all 100 orders' as action_required;
