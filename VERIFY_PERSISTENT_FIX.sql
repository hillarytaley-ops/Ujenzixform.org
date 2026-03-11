-- ============================================================
-- VERIFY: Ensure the fix will persist after page refresh
-- This checks that the provider ID resolution will work
-- when you're logged in (auth.uid() will be your actual user_id)
-- ============================================================

-- Step 1: Check your user account
SELECT 
  'Your User Account' as section,
  u.id as user_id,
  u.email,
  'This is what auth.uid() returns when you are logged in' as note
FROM auth.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: Check provider record - this is what RPC function looks for
SELECT 
  'Provider Record (RPC Lookup)' as section,
  dp.id as provider_id,
  dp.user_id,
  u.email as provider_user_email,
  CASE
    WHEN dp.user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
    THEN '✅ Provider user_id matches your account - RPC will find it!'
    ELSE '❌ Provider user_id does NOT match - RPC will NOT find it'
  END as rpc_will_work
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE dp.id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
LIMIT 1;

-- Step 3: Simulate what RPC function does when you're logged in
-- Replace 'YOUR_ACTUAL_USER_ID' with the user_id from Step 1
-- This simulates: SELECT id FROM delivery_providers WHERE user_id = auth.uid()
SELECT 
  'RPC Function Simulation' as section,
  your_user_id,
  (SELECT id FROM delivery_providers WHERE user_id = your_user_id LIMIT 1) as provider_id_rpc_will_find,
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid as orders_provider_id,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = your_user_id LIMIT 1) = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid
    THEN '✅ PERFECT MATCH - Orders will ALWAYS appear after refresh!'
    ELSE '❌ MISMATCH - Orders will disappear after refresh'
  END as persistence_status
FROM (
  SELECT id as your_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1
) as user_lookup;

-- Step 4: Final check - orders linked correctly
SELECT 
  'Orders Linkage' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  (SELECT id FROM delivery_providers 
   WHERE user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) 
   LIMIT 1) as your_provider_id,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers 
                                     WHERE user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) 
                                     LIMIT 1)
      OR dr.provider_id = (SELECT id FROM delivery_providers 
                           WHERE user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) 
                           LIMIT 1)
    THEN '✅ Orders linked to your provider - will persist!'
    ELSE '❌ Orders NOT linked correctly - will disappear'
  END as will_persist
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
