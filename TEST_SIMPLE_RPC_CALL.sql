-- ============================================================
-- TEST: Try calling the RPC function directly to see if it hangs
-- This will help determine if it's a function issue or client-side issue
-- ============================================================

-- Test 1: Try calling with a simple timeout simulation
DO $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_result JSONB;
  v_duration INTERVAL;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Try to call the function (will return empty in SQL Editor due to auth.uid() being NULL)
  SELECT get_deliveries_for_provider_unified() INTO v_result;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE 'Function call completed in: %', v_duration;
  RAISE NOTICE 'Result length: %', jsonb_array_length(v_result);
  
  -- If it takes more than 5 seconds, something is wrong
  IF v_duration > interval '5 seconds' THEN
    RAISE WARNING 'Function took longer than 5 seconds - may be hanging!';
  END IF;
END $$;

-- Test 2: Check if the query inside the function would work
DO $$
DECLARE
  v_provider_id UUID;
  v_count INTEGER;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Simulate what the function does (using a test provider ID)
  SELECT COUNT(*) INTO v_count
  FROM delivery_requests dr
  WHERE dr.provider_id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
    AND dr.status != 'cancelled'
  LIMIT 250;
  
  v_end_time := clock_timestamp();
  
  RAISE NOTICE 'Direct query completed in: %', v_end_time - v_start_time;
  RAISE NOTICE 'Order count: %', v_count;
  
  -- If this is fast but the function is slow, the issue is in the function logic
  IF v_end_time - v_start_time > interval '2 seconds' THEN
    RAISE WARNING 'Direct query is slow - may need indexes!';
  END IF;
END $$;
