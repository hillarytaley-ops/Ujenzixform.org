-- ===================================================================
-- DEBUG: Why accepted delivery is not showing in schedule
-- ===================================================================

-- Step 1: Find the most recently accepted delivery for taleyk@gmail.com
SELECT 
  'Most Recent Accepted Delivery' as check_type,
  dr.id,
  dr.status,
  dr.provider_id,
  dr.purchase_order_id,
  dr.order_number,
  dr.created_at,
  dr.accepted_at,
  dr.updated_at,
  po.po_number,
  po.status as po_status,
  po.delivery_provider_id as po_delivery_provider_id,
  dp.id as delivery_provider_id_from_table,
  dp.user_id as delivery_provider_user_id
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dr.provider_id = dp.id
WHERE dr.status = 'accepted'
  AND (
    dr.provider_id IN (
      SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
      UNION
      SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
    )
    OR po.delivery_provider_id IN (
      SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
      UNION
      SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
    )
  )
ORDER BY dr.accepted_at DESC, dr.updated_at DESC
LIMIT 5;

-- Step 2: Check provider ID matching
SELECT 
  'Provider ID Check' as check_type,
  u.id as user_id,
  u.email,
  dp.id as delivery_provider_id,
  dp.user_id as delivery_provider_user_id,
  CASE 
    WHEN dp.user_id = u.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as match_status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE u.email = 'taleyk@gmail.com';

-- Step 3: Check all accepted deliveries and their provider_ids
SELECT 
  'All Accepted Deliveries' as check_type,
  COUNT(*) as total_accepted,
  COUNT(DISTINCT provider_id) as unique_provider_ids,
  array_agg(DISTINCT provider_id) as provider_ids
FROM delivery_requests
WHERE status = 'accepted'
  AND status NOT IN ('delivered', 'completed', 'cancelled');

-- Step 4: Check if accepted delivery has correct provider_id
SELECT 
  'Accepted Delivery Provider Check' as check_type,
  dr.id,
  dr.status,
  dr.provider_id as dr_provider_id,
  dp.id as expected_provider_id,
  dp.user_id as expected_user_id,
  CASE 
    WHEN dr.provider_id = dp.id THEN '✅ CORRECT'
    ELSE '❌ WRONG PROVIDER_ID'
  END as provider_match
FROM delivery_requests dr
CROSS JOIN (
  SELECT id, user_id 
  FROM delivery_providers 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  LIMIT 1
) dp
WHERE dr.status = 'accepted'
  AND dr.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY dr.updated_at DESC
LIMIT 10;
