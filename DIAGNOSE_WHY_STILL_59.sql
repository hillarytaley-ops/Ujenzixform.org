-- ============================================================
-- DIAGNOSE: Why dashboard still shows 59 after fix
-- ============================================================

-- Step 1: Verify the fix was actually applied
SELECT 
  'Step 1: Check if Fix is Applied' as step,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ OLD VERSION - Fix NOT applied! Run APPLY_RPC_FIX_NOW.sql again'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' 
      AND pg_get_functiondef(oid) NOT LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '✅ NEW VERSION - Fix IS applied'
    ELSE 
      '⚠️ Cannot determine - check function manually'
  END as fix_status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 2: Count orders that should appear (simulating what RPC should return)
SELECT 
  'Step 2: Orders That Should Appear' as step,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  COUNT(DISTINCT CASE WHEN po.status IN ('rejected', 'quote_rejected') THEN dr.id END) as orders_with_rejected_quote,
  COUNT(DISTINCT CASE WHEN po.status = 'cancelled' THEN dr.id END) as orders_with_cancelled_po,
  COUNT(DISTINCT CASE 
    WHEN (po.id IS NULL OR po.status != 'cancelled')
      AND dr.status NOT IN ('cancelled')
    THEN dr.id 
  END) as orders_that_should_appear
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived');

-- Step 3: Check if there are other filters in the RPC function we missed
SELECT 
  'Step 3: Check for Other Filters' as step,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%dr.status NOT IN%' THEN 'Has delivery_requests status filter'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN%' THEN 'Has purchase_orders status filter'
    ELSE 'No status filters found'
  END as filters_found
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 4: Show breakdown of orders by purchase_orders.status
SELECT 
  'Step 4: Breakdown by purchase_orders.status' as step,
  COALESCE(po.status, 'NULL (no purchase_order)') as purchase_order_status,
  COUNT(*) as count,
  CASE 
    WHEN po.status IN ('rejected', 'quote_rejected') THEN 
      'These should NOW appear after fix (were excluded before)'
    WHEN po.status = 'cancelled' THEN 
      'These are correctly excluded (truly cancelled)'
    WHEN po.status IS NULL THEN 
      'These should appear (no purchase_order to filter)'
    ELSE 
      'These should appear'
  END as should_appear
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
GROUP BY po.status
ORDER BY count DESC;

-- Step 5: Check if the issue is with provider_id resolution
SELECT 
  'Step 5: Provider ID Check' as step,
  (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) as your_provider_id,
  COUNT(DISTINCT dr.id) as orders_with_your_provider_id,
  'If provider_id is NULL, that is the problem' as note
FROM delivery_requests dr
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1);
