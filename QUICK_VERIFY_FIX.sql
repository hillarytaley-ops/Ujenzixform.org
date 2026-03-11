-- ============================================================
-- QUICK VERIFY: Check if RPC fix has been applied
-- ============================================================

-- Check 1: Does the function have the OLD restrictive filters?
SELECT 
  'Check 1: Old Restrictive Filters' as check_name,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ STILL HAS OLD FILTERS - Fix NOT applied yet'
    ELSE 
      '✅ Old filters removed'
  END as status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Check 2: Does the function have the NEW fix (only cancelled)?
SELECT 
  'Check 2: New Fix Applied' as check_name,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' 
      AND pg_get_functiondef(oid) NOT LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '✅ FIX APPLIED - Only filters cancelled orders'
    ELSE 
      '❌ Fix not applied - Run APPLY_RPC_FIX_NOW.sql'
  END as status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Check 3: Count orders that should appear (using email lookup)
SELECT 
  'Check 3: Orders That Should Appear' as check_name,
  COUNT(DISTINCT dr.id) as total_orders,
  'After fix, all these should appear in dashboard' as note
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived')
  AND (po.id IS NULL OR po.status != 'cancelled');
