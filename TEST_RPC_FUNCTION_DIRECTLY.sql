-- ============================================================
-- TEST: RPC function directly to see what it's returning
-- This will help us understand if the RPC is the issue
-- ============================================================

-- Step 1: Check the function definition to ensure fix is applied
SELECT 
  'Step 1: Function Definition Check' as step,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status != ''cancelled''%' 
      OR (pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%'
          AND pg_get_functiondef(oid) NOT LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%')
    THEN '✅ Fix is applied - only filters cancelled'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ OLD VERSION - Still has restrictive filters'
    ELSE 
      '⚠️ Cannot determine - check manually'
  END as fix_status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 2: Count orders that should be returned by RPC (using email lookup)
-- This simulates what the RPC should return when auth.uid() works
SELECT 
  'Step 2: Orders That Should Appear in RPC' as step,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT CASE WHEN po.status IN ('rejected', 'quote_rejected') THEN dr.id END) as orders_with_rejected_quote,
  COUNT(DISTINCT CASE WHEN po.status = 'cancelled' THEN dr.id END) as orders_with_cancelled_po,
  COUNT(DISTINCT CASE 
    WHEN (po.id IS NULL OR po.status != 'cancelled')
      AND dr.status NOT IN ('cancelled')
    THEN dr.id 
  END) as orders_that_should_appear,
  'These should all appear after the fix' as note
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived');

-- Step 3: Show breakdown by purchase_orders.status
SELECT 
  'Step 3: Breakdown by purchase_orders.status' as step,
  COALESCE(po.status, 'NULL (no purchase_order)') as purchase_order_status,
  COUNT(*) as count,
  CASE 
    WHEN po.status IN ('rejected', 'quote_rejected') THEN 
      '✅ Should appear after fix (were excluded before)'
    WHEN po.status = 'cancelled' THEN 
      '❌ Correctly excluded (truly cancelled)'
    WHEN po.status IS NULL THEN 
      '✅ Should appear (no purchase_order to filter)'
    ELSE 
      '✅ Should appear'
  END as should_appear_after_fix
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
GROUP BY po.status
ORDER BY count DESC;

-- Step 4: Check if there are orders from purchase_orders table that should also appear
SELECT 
  'Step 4: Orders from purchase_orders table' as step,
  COUNT(DISTINCT po.id) as total_purchase_orders,
  COUNT(DISTINCT CASE WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN po.id END) as with_your_provider_id,
  COUNT(DISTINCT CASE 
    WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
      AND po.status != 'cancelled'
      AND NOT EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.purchase_order_id = po.id)
    THEN po.id 
  END) as orders_without_delivery_request
FROM purchase_orders po
WHERE po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND po.status != 'cancelled';

-- Step 5: Important Note
SELECT 
  'Step 5: Important Note' as step,
  'The RPC function uses auth.uid() which is NULL in SQL Editor' as note_1,
  'This means the RPC will return 0 orders when run here' as note_2,
  'To test the RPC, you must call it from the app (logged in)' as note_3,
  'Check browser console logs (🔵 Unified RPC) to see actual results' as note_4;
