-- ============================================================
-- VERIFY: Check if minimal RPC is still deployed correctly
-- ============================================================

-- Check 1: Function exists
SELECT 
  'Function Exists' as check_type,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists;

-- Check 2: Function definition contains minimal version markers
SELECT 
  'Function Version Check' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%dr_data%' AND pg_get_functiondef(oid) LIKE '%row_to_json%' THEN '✅ Minimal version (correct)'
    WHEN pg_get_functiondef(oid) LIKE '%simple_orders%' THEN '⚠️ Ultra-simple version (should work but slower)'
    WHEN pg_get_functiondef(oid) LIKE '%delivery_orders%' AND pg_get_functiondef(oid) LIKE '%DISTINCT ON%' THEN '❌ Old version with DISTINCT ON (will timeout)'
    ELSE '❓ Unknown version'
  END as version_status,
  LENGTH(pg_get_functiondef(oid)) as function_length
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;

-- Check 3: Test function call (will return 0 in SQL Editor due to auth.uid() being NULL)
SELECT 
  'Function Call Test' as check_type,
  jsonb_array_length(get_deliveries_for_provider_unified()) as order_count,
  '⚠️ Will be 0 in SQL Editor (auth.uid() is NULL)' as note;

-- Check 4: Show first 500 chars of function definition
SELECT 
  'Function Definition Preview' as check_type,
  LEFT(pg_get_functiondef(oid), 500) as function_start
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;
