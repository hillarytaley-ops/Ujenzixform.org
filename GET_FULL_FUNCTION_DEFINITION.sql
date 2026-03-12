-- ============================================================
-- GET FULL: Complete function definition to verify it's correct
-- ============================================================

-- Get the complete function definition
SELECT 
  'Full Function Definition' as check_type,
  pg_get_functiondef(oid) as complete_definition
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;

-- Also check if there are any syntax issues by trying to explain the function
SELECT 
  'Function Status' as check_type,
  proname as function_name,
  prorettype::regtype as return_type,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER (can use auth.uid())'
    ELSE '❌ NOT SECURITY DEFINER (auth.uid() will be NULL)'
  END as security_status
FROM pg_proc 
WHERE proname = 'get_deliveries_for_provider_unified'
LIMIT 1;
