-- ============================================================
-- TEST: Check if the two orders appear in RPC function result
-- Run this in Supabase SQL Editor (while logged in as delivery provider)
-- ============================================================

-- Step 1: Call the RPC function and filter for the two orders
SELECT 
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'purchase_order_id' as purchase_order_id,
  result->>'_categorized_status' as categorized_status,
  CASE 
    WHEN result->>'order_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
       OR result->>'po_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
    THEN '✅ FOUND IN RPC RESULT'
    ELSE 'Not one of the target orders'
  END as match_status
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'order_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
   OR result->>'po_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 2: Get ALL results from RPC to see what's being returned
SELECT 
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'purchase_order_id' as purchase_order_id,
  result->>'status' as status,
  result->>'po_status' as po_status,
  result->>'purchase_order_status' as purchase_order_status,
  result->>'_categorized_status' as categorized_status,
  result->>'_items_count' as items_count,
  result->>'_dispatched_count' as dispatched_count,
  result->>'_received_count' as received_count,
  result->>'delivery_provider_id' as delivery_provider_id,
  result->>'provider_id' as provider_id
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
ORDER BY result->>'updated_at' DESC NULLS LAST, result->>'created_at' DESC
LIMIT 20;

-- Step 3: Check if the orders are in the 'scheduled' category
SELECT 
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'_categorized_status' as categorized_status,
  result->>'_dispatched_count' as dispatched_count,
  result->>'_received_count' as received_count,
  result->>'_items_count' as total_items,
  CASE
    WHEN result->>'_categorized_status' = 'scheduled' THEN '✅ Will appear in Scheduled dropdown'
    WHEN result->>'_categorized_status' = 'in_transit' THEN '⚠️ Will appear in Scheduled (due to TypeScript fix)'
    WHEN result->>'_categorized_status' = 'delivered' THEN '❌ Will appear in Delivered tab'
    ELSE '❓ Unknown status'
  END as where_it_will_appear
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'order_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
   OR result->>'po_number' IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 4: Verify provider ID matching
-- Check if your provider ID matches what's in the orders
SELECT 
  'Your Provider ID' as label,
  dp.id as provider_id,
  dp.user_id,
  dp.provider_name
FROM delivery_providers dp
WHERE dp.user_id = auth.uid()
LIMIT 1;

-- Compare with what's in the orders
SELECT 
  'Order Provider IDs' as label,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      OR dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
    THEN '✅ MATCHES YOUR PROVIDER ID'
    ELSE '❌ DOES NOT MATCH'
  END as match_check
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
