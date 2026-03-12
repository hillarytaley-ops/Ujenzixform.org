-- ============================================================
-- TEST: Call RPC function directly to see if it works
-- Note: This will return 0 in SQL Editor (auth.uid() is NULL)
-- But we can check the function structure
-- ============================================================

-- Test 1: Check if function can be called (will be 0 in SQL Editor)
SELECT 
  'Direct RPC Call' as test_type,
  jsonb_array_length(get_deliveries_for_provider_unified()) as order_count,
  '⚠️ Will be 0 in SQL Editor (auth.uid() is NULL)' as note;

-- Test 2: Check function execution time (simulate with manual query)
DO $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration INTERVAL;
  v_provider_id UUID;
  v_count INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Simulate what RPC does
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com' LIMIT 1)
  LIMIT 1;
  
  SELECT COUNT(*) INTO v_count
  FROM delivery_requests
  WHERE provider_id = v_provider_id
    AND status != 'cancelled'
  LIMIT 250;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE 'Query took: %', v_duration;
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE 'Order count: %', v_count;
END $$;

-- Test 3: Check for locks or slow queries
SELECT 
  'Active Queries' as test_type,
  COUNT(*) as active_query_count
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%';
