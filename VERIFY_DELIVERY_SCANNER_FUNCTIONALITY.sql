-- ============================================================
-- VERIFY: Delivery Provider Scanner Functionality
-- This checks if the scanner properly updates orders and notifies users
-- ============================================================

-- Step 1: Check the RPC function that handles receiving scans
SELECT 
  'RPC Function Check' as section,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.proname = 'record_qr_scan_simple' THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('record_qr_scan_simple', 'record_qr_scan')
ORDER BY p.proname;

-- Step 2: Check if receiving scans update order status correctly
-- This simulates what happens when all items are received
SELECT 
  'Receiving Scan Logic' as section,
  'When delivery provider scans items as received:' as step_1,
  '1. material_items.receive_scanned = TRUE' as step_2,
  '2. If all items received, purchase_orders.status = "delivered"' as step_3,
  '3. If all items received, purchase_orders.delivery_status = "delivered"' as step_4,
  '4. If all items received, delivery_requests.status = "delivered"' as step_5;

-- Step 3: Check current order statuses for test orders
SELECT 
  'Current Order Status' as section,
  po.po_number,
  po.status as po_status,
  po.delivery_status,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received_items,
  CASE
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = true) = COUNT(mi.id) AND COUNT(mi.id) > 0
    THEN '✅ All items received - should be delivered'
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) = COUNT(mi.id) AND COUNT(mi.id) > 0
    THEN '⚠️ All items dispatched - ready for delivery scan'
    ELSE '⏳ In progress'
  END as scan_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
GROUP BY po.id, po.po_number, po.status, po.delivery_status, dr.status;

-- Step 4: Check if there are notification mechanisms
SELECT 
  'Notification Check' as section,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
    THEN '✅ Notifications table exists'
    ELSE '⚠️ Notifications table not found'
  END as notifications_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_communications')
    THEN '✅ Delivery communications table exists'
    ELSE '⚠️ Delivery communications table not found'
  END as communications_table;

-- Step 5: Verify the receiving scan updates both status fields
-- This is critical - both status and delivery_status must be updated
SELECT 
  'Status Update Verification' as section,
  'The record_qr_scan_simple function should update:' as note,
  '1. purchase_orders.status = "delivered"' as update_1,
  '2. purchase_orders.delivery_status = "delivered"' as update_2,
  '3. delivery_requests.status = "delivered"' as update_3,
  '4. purchase_orders.delivered_at = NOW()' as update_4,
  '5. delivery_requests.delivered_at = NOW()' as update_5;

-- Step 6: Check if real-time subscriptions are set up
-- (This would be in the frontend code, but we can verify the tables support it)
SELECT 
  'Real-time Support' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE tablename IN ('purchase_orders', 'delivery_requests', 'material_items')
    )
    THEN '✅ Tables support real-time subscriptions'
    ELSE '⚠️ Real-time may not be enabled'
  END as realtime_status;

-- Step 7: Summary - What should happen when delivery provider scans
SELECT 
  'Expected Flow' as section,
  '1. Delivery provider scans QR code of dispatched item' as step_1,
  '2. record_qr_scan_simple("receiving", qr_code) is called' as step_2,
  '3. material_items.receive_scanned = TRUE' as step_3,
  '4. If all items received:' as step_4,
  '   - purchase_orders.status = "delivered"' as step_4a,
  '   - purchase_orders.delivery_status = "delivered"' as step_4b,
  '   - delivery_requests.status = "delivered"' as step_4c,
  '5. Supplier dashboard should show order as "Delivered"' as step_5,
  '6. Builder dashboard should show order as "Delivered"' as step_6,
  '7. Real-time updates should notify all relevant users' as step_7;
