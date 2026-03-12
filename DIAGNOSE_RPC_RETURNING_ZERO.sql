-- ============================================================
-- DIAGNOSE: Why unified RPC is returning 0 orders
-- ============================================================

-- Step 1: Check if the RPC function exists
SELECT 
  'Step 1: Check RPC Function Exists' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deliveries_for_provider_unified') THEN 
      '✅ Function exists'
    ELSE 
      '❌ Function does NOT exist - Run FINAL_RPC_FIX_APPLY_NOW.sql'
  END as status;

-- Step 2: Verify the function definition has the fix
SELECT 
  'Step 2: Verify Fix Applied' as step,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%po.status != ''cancelled''%' 
      AND pg_get_functiondef(oid) NOT LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '✅ Fix is applied - only filters cancelled'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'')%' 
      AND pg_get_functiondef(oid) NOT LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '✅ Fix is applied - only filters cancelled'
    WHEN pg_get_functiondef(oid) LIKE '%po.status NOT IN (''cancelled'', ''rejected'', ''quote_rejected'')%' THEN 
      '❌ OLD VERSION - Still has restrictive filters'
    ELSE 
      '⚠️ Cannot determine - check manually'
  END as fix_status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 3: Count orders that should be returned (using email lookup)
SELECT 
  'Step 3: Orders That Should Appear' as step,
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

-- Step 4: Check provider record setup
SELECT 
  'Step 4: Provider Record Check' as step,
  dp.id as provider_id,
  dp.user_id,
  u.email as user_email,
  CASE 
    WHEN dp.user_id IS NULL THEN '❌ user_id is NULL - RPC cannot find provider'
    WHEN dp.user_id != (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN 
      '❌ user_id does not match user - RPC cannot find provider'
    ELSE 
      '✅ Provider record is correctly linked'
  END as provider_status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE LOWER(TRIM(COALESCE(dp.email, ''))) = LOWER(TRIM('taleyk@gmail.com'))
   OR u.email = 'taleyk@gmail.com'
LIMIT 1;

-- Step 5: Important Note
SELECT 
  'Step 5: Important Note' as step,
  'The RPC function uses auth.uid() which is NULL in SQL Editor' as note_1,
  'This means the RPC will return 0 orders when run here' as note_2,
  'To test the RPC, check browser console logs (🔵 Unified RPC)' as note_3,
  'If RPC returns 0, check if provider record user_id matches auth.uid()' as note_4;
