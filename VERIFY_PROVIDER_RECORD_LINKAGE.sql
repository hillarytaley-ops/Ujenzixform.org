-- ============================================================
-- VERIFY: Provider record is correctly linked to user
-- This is critical for the RPC function to work
-- ============================================================

-- Step 1: Find the user by email
SELECT 
  'Step 1: Find User by Email' as step,
  id as user_id,
  email,
  'Use this user_id in Step 2' as note
FROM auth.users
WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'));

-- Step 2: Check if provider record exists and is linked
-- Replace 'YOUR_USER_ID_HERE' with the user_id from Step 1
SELECT 
  'Step 2: Provider Record Check' as step,
  dp.id as provider_id,
  dp.user_id,
  dp.email as provider_email,
  u.email as user_email,
  CASE 
    WHEN dp.user_id IS NULL THEN 
      '❌ CRITICAL: user_id is NULL - RPC cannot find provider!'
    WHEN dp.user_id != (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN 
      '❌ CRITICAL: user_id does not match user - RPC cannot find provider!'
    ELSE 
      '✅ Provider record is correctly linked'
  END as status,
  CASE 
    WHEN dp.user_id IS NULL THEN 
      'Run: UPDATE delivery_providers SET user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM(''taleyk@gmail.com'')) LIMIT 1) WHERE id = ''' || dp.id || ''';'
    WHEN dp.user_id != (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN 
      'Run: UPDATE delivery_providers SET user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM(''taleyk@gmail.com'')) LIMIT 1) WHERE id = ''' || dp.id || ''';'
    ELSE 
      'No fix needed'
  END as fix_command
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE LOWER(TRIM(COALESCE(dp.email, ''))) = LOWER(TRIM('taleyk@gmail.com'))
   OR u.email = 'taleyk@gmail.com'
LIMIT 1;

-- Step 3: Count orders that should appear
SELECT 
  'Step 3: Orders That Should Appear' as step,
  COUNT(DISTINCT dr.id) as total_delivery_requests,
  'These should all appear in RPC when provider is correctly linked' as note
FROM delivery_requests dr
WHERE dr.provider_id = (
  SELECT dp.id FROM delivery_providers dp 
  WHERE LOWER(TRIM(COALESCE(dp.email, ''))) = LOWER(TRIM('taleyk@gmail.com'))
     OR dp.user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  LIMIT 1
)
  AND dr.status IN ('accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived');

-- Step 4: Quick Fix (if provider record is not linked)
-- Uncomment and run this if Step 2 shows user_id is NULL or doesn't match
/*
UPDATE delivery_providers 
SET user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
WHERE id = (SELECT dp.id FROM delivery_providers dp 
  WHERE LOWER(TRIM(COALESCE(dp.email, ''))) = LOWER(TRIM('taleyk@gmail.com'))
     OR dp.user_id = (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  LIMIT 1);
*/
