-- ============================================================
-- DIAGNOSE: Why is get_deliveries_for_provider_unified() returning 0?
-- ============================================================

-- Step 1: Check if function exists
SELECT 
  'Function exists?' as check_type,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists;

-- Step 2: Check function definition (first 500 chars)
SELECT 
  'Function definition' as check_type,
  LEFT(pg_get_functiondef(oid), 500) as function_start
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;

-- Step 3: Check provider record for taleyk@gmail.com
SELECT 
  'Provider record check' as check_type,
  dp.id as provider_id,
  dp.user_id,
  u.email,
  u.id as auth_user_id,
  CASE 
    WHEN dp.user_id = u.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as match_status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE u.email = 'taleyk@gmail.com'
LIMIT 1;

-- Step 4: Count orders linked to provider
SELECT 
  'Orders linked to provider' as check_type,
  COUNT(DISTINCT dr.id) as delivery_requests_count,
  COUNT(DISTINCT po.id) as purchase_orders_count
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
LEFT JOIN delivery_requests dr ON dr.provider_id = dp.id
LEFT JOIN purchase_orders po ON po.delivery_provider_id = dp.id
WHERE u.email = 'taleyk@gmail.com';

-- Step 5: Test RPC function directly (will return 0 in SQL Editor because auth.uid() is NULL)
-- This is expected - the function needs to run in the app context
SELECT 
  'RPC test (SQL Editor)' as check_type,
  '⚠️ auth.uid() is NULL in SQL Editor - this is expected' as note,
  jsonb_array_length(get_deliveries_for_provider_unified()) as order_count;

-- Step 6: Manual query to simulate what RPC should return
WITH provider_lookup AS (
  SELECT dp.id as provider_id
  FROM delivery_providers dp
  JOIN auth.users u ON u.id = dp.user_id
  WHERE u.email = 'taleyk@gmail.com'
  LIMIT 1
),
delivery_orders AS (
  SELECT DISTINCT ON (COALESCE(dr.purchase_order_id, dr.id))
    dr.id,
    COALESCE(dr.purchase_order_id, dr.id) AS purchase_order_id,
    COALESCE(dr.order_number, po.po_number, 'PO-' || UPPER(SUBSTRING(COALESCE(dr.purchase_order_id, dr.id)::text, 1, 8))) AS order_number,
    dr.status,
    COALESCE(po.status, dr.status) AS po_status
  FROM delivery_requests dr
  LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
  CROSS JOIN provider_lookup pl
  WHERE dr.provider_id = pl.provider_id
    AND dr.status != 'cancelled'
    AND (po.id IS NULL OR po.status != 'cancelled')
  ORDER BY COALESCE(dr.purchase_order_id, dr.id), dr.updated_at DESC
  LIMIT 250
)
SELECT 
  'Manual query result' as check_type,
  COUNT(*) as order_count,
  COUNT(DISTINCT purchase_order_id) as unique_po_count
FROM delivery_orders;
