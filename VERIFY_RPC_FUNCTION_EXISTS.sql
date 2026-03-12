-- ============================================================
-- VERIFY: Check if get_deliveries_for_provider_unified() exists and its definition
-- ============================================================

-- Step 1: Check if function exists
SELECT 
  'Function Status' as check_type,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists,
  COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified';

-- Step 2: Get full function definition
SELECT 
  'Function Definition' as check_type,
  pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;

-- Step 3: Check function parameters and return type
SELECT 
  'Function Signature' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as is_security_definer,
  p.provolatile as volatility
FROM pg_proc p
WHERE p.proname = 'get_deliveries_for_provider_unified'
LIMIT 1;
