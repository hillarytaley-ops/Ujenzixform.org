-- ============================================================
-- TEST: Verify the ultra-simple RPC function works
-- Note: This will return 0 in SQL Editor (auth.uid() is NULL)
-- But it will work in the app when logged in
-- ============================================================

-- Test 1: Check function exists and can be called
SELECT 
  'Function Test' as test_type,
  jsonb_array_length(get_deliveries_for_provider_unified()) as order_count_in_sql_editor,
  '⚠️ This will be 0 in SQL Editor (auth.uid() is NULL)' as note;

-- Test 2: Check function definition includes the new logic
SELECT 
  'Function Definition Check' as test_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%simple_orders%' THEN '✅ Uses simple_orders CTE (ultra-simple version)'
    WHEN pg_get_functiondef(oid) LIKE '%delivery_orders%' THEN '⚠️ Still uses delivery_orders CTE (old version)'
    ELSE '❓ Unknown version'
  END as version_check
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;

-- Test 3: Manual query to simulate what RPC should return (for taleyk@gmail.com)
WITH provider_lookup AS (
  SELECT dp.id as provider_id
  FROM delivery_providers dp
  JOIN auth.users u ON u.id = dp.user_id
  WHERE u.email = 'taleyk@gmail.com'
  LIMIT 1
),
simple_orders AS (
  SELECT 
    dr.id,
    COALESCE(dr.purchase_order_id, dr.id) AS purchase_order_id,
    COALESCE(dr.order_number, 'DR-' || SUBSTRING(dr.id::text, 1, 8)) AS order_number,
    dr.status,
    dr.updated_at
  FROM delivery_requests dr
  CROSS JOIN provider_lookup pl
  WHERE dr.provider_id = pl.provider_id
    AND dr.status != 'cancelled'
  ORDER BY dr.updated_at DESC
  LIMIT 250
)
SELECT 
  'Manual Query Test' as test_type,
  COUNT(*) as order_count,
  'This should match RPC result when logged in' as note
FROM simple_orders;
