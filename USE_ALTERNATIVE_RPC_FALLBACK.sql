-- ============================================================
-- ALTERNATIVE: Use get_active_deliveries_for_provider() as fallback
-- This RPC already exists and might be faster
-- ============================================================

-- Check if get_active_deliveries_for_provider exists
SELECT 
  'Alternative RPC Check' as check_type,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_active_deliveries_for_provider'
  ) as function_exists,
  'This can be used as a fallback if get_deliveries_for_provider_unified times out' as note;

-- Show function signature
SELECT 
  'Function Signature' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'get_active_deliveries_for_provider'
LIMIT 1;
