-- ===================================================================
-- DIAGNOSE WHY 62 DELIVERIES ARE STILL SHOWING
-- This will show exactly what orders are still linked to taleyk@gmail.com
-- ===================================================================

-- Step 1: Find user and provider IDs
SELECT 
  'User Info' as section,
  u.id as user_id,
  u.email,
  dp.id as provider_id,
  dp.user_id as provider_user_id
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE u.email = 'taleyk@gmail.com';

-- Step 2: Count delivery_requests by provider_id
SELECT 
  'Delivery Requests by provider_id' as source,
  COUNT(*) as count,
  status,
  provider_id
FROM delivery_requests
WHERE provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed', 'cancelled')
GROUP BY status, provider_id
ORDER BY count DESC;

-- Step 3: Count delivery_requests linked via purchase_orders
SELECT 
  'Delivery Requests via purchase_orders' as source,
  COUNT(*) as count,
  dr.status,
  po.delivery_provider_id
FROM delivery_requests dr
INNER JOIN purchase_orders po ON dr.purchase_order_id = po.id
WHERE po.delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
GROUP BY dr.status, po.delivery_provider_id
ORDER BY count DESC;

-- Step 4: Count purchase_orders with delivery_provider_id
SELECT 
  'Purchase Orders with delivery_provider_id' as source,
  COUNT(*) as count,
  status,
  delivery_provider_id
FROM purchase_orders
WHERE delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed')
GROUP BY status, delivery_provider_id
ORDER BY count DESC;

-- Step 5: Show sample delivery_requests that are still linked
SELECT 
  'Sample Delivery Requests Still Linked' as info,
  dr.id,
  dr.status,
  dr.provider_id,
  dr.purchase_order_id,
  dr.order_number,
  dr.created_at
FROM delivery_requests dr
WHERE (
  dr.provider_id IN (
    SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
    UNION
    SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
  )
  OR dr.purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE delivery_provider_id IN (
      SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
      UNION
      SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
    )
  )
)
AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
ORDER BY dr.created_at DESC
LIMIT 20;
