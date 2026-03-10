-- ============================================================
-- TEST: Check if RPC function returns the In Transit orders
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Test the RPC function (you need to be logged in as the delivery provider)
SELECT * FROM get_deliveries_for_provider_unified();

-- Step 2: Check if the specific orders appear in the result
-- Look for orders with these order_numbers:
-- 'PO-1772597930676-IATLA'
-- 'QR-1772324057410-ROZCS'

-- Step 3: Manual check - verify the orders should be included
-- This shows what the RPC function SHOULD return for these orders
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) as received_items,
  CASE
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'delivered'
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'scheduled'  -- Should be 'scheduled' for delivery provider
    ELSE 'scheduled'
  END as expected_categorized_status,
  CASE
    WHEN po.delivery_provider_id IS NOT NULL THEN 'Has delivery_provider_id'
    WHEN dr.provider_id IS NOT NULL THEN 'Has delivery_request provider_id'
    ELSE 'MISSING BOTH - WILL NOT APPEAR'
  END as provider_link_status
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, dr.provider_id, dr.status;

-- Step 4: Check what provider_id the current user should match
-- Replace 'YOUR_USER_ID' with the actual delivery provider user ID
SELECT 
  dp.id as delivery_provider_id,
  dp.user_id,
  dp.provider_name,
  dp.company_name,
  'This is the provider_id that should match' as note
FROM delivery_providers dp
WHERE dp.user_id = auth.uid()
LIMIT 1;

-- Step 5: Check if delivery_requests have the correct provider_id
SELECT 
  dr.id,
  dr.purchase_order_id,
  dr.provider_id,
  dr.status,
  po.po_number,
  po.delivery_provider_id as po_delivery_provider_id,
  CASE
    WHEN dr.provider_id IS NOT NULL THEN 'Has provider_id'
    ELSE 'MISSING provider_id'
  END as status_check
FROM delivery_requests dr
JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
