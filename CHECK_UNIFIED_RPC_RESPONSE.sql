-- ============================================================
-- CHECK: What the unified RPC is actually returning
-- This will help us see if the RPC is working correctly
-- ============================================================

-- Note: This will return 0 in SQL Editor because auth.uid() is NULL
-- But it will show the structure and help diagnose
SELECT 
  'RPC Function Test (auth.uid() is NULL in SQL Editor)' as note,
  'Run this in the app console to see actual results' as instruction,
  jsonb_array_length(get_deliveries_for_provider_unified()) as total_orders_in_rpc;

-- Show the structure of what the RPC returns
SELECT 
  'RPC Function Structure' as section,
  result->>'order_number' as order_number,
  result->>'_categorized_status' as status,
  result->>'purchase_order_id' as po_id
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
LIMIT 10;

-- Count by status
SELECT 
  'RPC Results by Status' as section,
  result->>'_categorized_status' as status,
  COUNT(*) as count
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
GROUP BY result->>'_categorized_status';
