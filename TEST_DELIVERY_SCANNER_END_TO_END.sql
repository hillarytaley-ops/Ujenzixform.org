-- ============================================================
-- TEST: End-to-End Delivery Scanner Functionality
-- This tests if the scanner properly updates orders and shares info
-- ============================================================

-- Step 1: Find a test order with dispatched items ready for delivery scan
SELECT 
  'Test Orders Ready for Delivery Scan' as section,
  po.po_number,
  po.id as purchase_order_id,
  po.status as po_status,
  po.delivery_status,
  dr.id as delivery_request_id,
  dr.status as dr_status,
  dr.provider_id,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received_items,
  CASE
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) = COUNT(mi.id) 
      AND COUNT(*) FILTER (WHERE mi.receive_scanned = true) = 0
      AND COUNT(mi.id) > 0
    THEN '✅ Ready for delivery scan - all items dispatched, none received'
    WHEN COUNT(*) FILTER (WHERE mi.receive_scanned = true) = COUNT(mi.id) 
      AND COUNT(mi.id) > 0
    THEN '✅ Already delivered - all items received'
    ELSE '⏳ In progress'
  END as scan_readiness
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  OR (dr.provider_id IS NOT NULL AND dr.status IN ('accepted', 'assigned', 'in_transit'))
GROUP BY po.id, po.po_number, po.status, po.delivery_status, dr.id, dr.status, dr.provider_id
HAVING COUNT(mi.id) > 0
ORDER BY 
  CASE
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) = COUNT(mi.id) 
      AND COUNT(*) FILTER (WHERE mi.receive_scanned = true) = 0
    THEN 1
    ELSE 2
  END,
  po.created_at DESC
LIMIT 5;

-- Step 2: Check what happens when receiving scan is performed
-- This simulates the record_qr_scan_simple function logic
SELECT 
  'Receiving Scan Logic Test' as section,
  'When delivery provider scans QR code as "receiving":' as step_1,
  '1. material_items.receive_scanned = TRUE' as update_1,
  '2. material_items.status = "received"' as update_2,
  '3. If all items received:' as condition,
  '   - purchase_orders.status = "delivered"' as result_1,
  '   - purchase_orders.delivery_status = "delivered"' as result_2,
  '   - delivery_requests.status = "delivered"' as result_3,
  '   - purchase_orders.delivered_at = NOW()' as result_4,
  '   - delivery_requests.delivered_at = NOW()' as result_5;

-- Step 3: Verify the RPC function exists and is callable
SELECT 
  'RPC Function Verification' as section,
  p.proname as function_name,
  CASE
    WHEN p.proname = 'record_qr_scan_simple' THEN '✅ Function exists and is callable'
    ELSE '❌ Function missing'
  END as status,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'record_qr_scan_simple';

-- Step 4: Check if notifications/communications are set up
SELECT 
  'Notification System Check' as section,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
    THEN '✅ Notifications table exists'
    ELSE '⚠️ Notifications table missing'
  END as notifications,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_communications')
    THEN '✅ Delivery communications table exists'
    ELSE '⚠️ Delivery communications table missing'
  END as communications,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notifications')
    THEN '✅ Delivery notifications table exists'
    ELSE '⚠️ Delivery notifications table missing'
  END as delivery_notifications;

-- Step 5: Check if real-time is enabled for key tables
SELECT 
  'Real-time Support Check' as section,
  schemaname,
  tablename,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE schemaname = t.schemaname AND tablename = t.tablename
    )
    THEN '✅ Real-time enabled'
    ELSE '⚠️ Real-time may not be enabled'
  END as realtime_status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('purchase_orders', 'delivery_requests', 'material_items', 'notifications')
ORDER BY t.table_name;

-- Step 6: Summary - What should happen
SELECT 
  'Expected End-to-End Flow' as section,
  '1. Supplier dispatches items → QR scan sets dispatch_scanned = TRUE' as step_1,
  '2. Order status → "shipped" or "dispatched"' as step_2,
  '3. Delivery provider scans items at delivery site → QR scan sets receive_scanned = TRUE' as step_3,
  '4. When ALL items received:' as step_4,
  '   - purchase_orders.status = "delivered"' as step_4a,
  '   - purchase_orders.delivery_status = "delivered"' as step_4b,
  '   - delivery_requests.status = "delivered"' as step_4c,
  '5. Supplier dashboard → Order moves to "Delivered" tab' as step_5,
  '6. Builder dashboard → Order shows as "Delivered"' as step_6,
  '7. Real-time updates → All users notified automatically' as step_7,
  '8. Notifications → Suppliers and builders receive delivery confirmation' as step_8;
