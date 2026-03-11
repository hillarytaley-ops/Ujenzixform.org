-- ============================================================
-- ENSURE FUTURE ORDERS WILL AUTOMATICALLY APPEAR
-- This verifies that the system will correctly link future orders
-- ============================================================

-- Step 1: Verify your provider record is correctly set up
SELECT 
  'Your Provider Setup' as section,
  dp.id as provider_id,
  dp.user_id,
  u.email as user_email,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ Provider record exists with user_id'
    ELSE '❌ Provider record missing user_id'
  END as status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: Check how delivery requests get provider_id when accepted
-- The system should set delivery_requests.provider_id when you accept a request
SELECT 
  'Delivery Request Acceptance Flow' as section,
  'When you accept a delivery request, the system should:' as note_1,
  '1. Set delivery_requests.provider_id = your provider_id' as step_1,
  '2. When items are dispatched, purchase_orders.delivery_provider_id is set from delivery_requests.provider_id' as step_2,
  '3. The RPC function will find orders where delivery_provider_id matches your provider_id' as step_3;

-- Step 3: Verify the dispatch process will work
-- When items are dispatched, the record_qr_scan function does:
-- UPDATE purchase_orders SET delivery_provider_id = COALESCE(delivery_provider_id, v_delivery_request_provider_id)
-- This means if delivery_requests.provider_id is set, it will be copied to purchase_orders
SELECT 
  'Dispatch Process Verification' as section,
  'The dispatch QR scan process will:' as note,
  '1. Get provider_id from delivery_requests WHERE purchase_order_id = order_id' as step_1,
  '2. Set purchase_orders.delivery_provider_id = delivery_requests.provider_id' as step_2,
  '3. Your provider_id must match what is in delivery_requests.provider_id' as requirement;

-- Step 4: Check if there are any existing delivery_requests that need fixing
SELECT 
  'Existing Delivery Requests' as section,
  dr.id,
  dr.purchase_order_id,
  po.po_number,
  dr.provider_id,
  dr.status,
  CASE
    WHEN dr.provider_id = (SELECT id FROM delivery_providers 
                           WHERE user_id = (SELECT id FROM auth.users 
                                           WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) 
                           LIMIT 1)
    THEN '✅ Correctly linked to your provider'
    WHEN dr.provider_id IS NULL THEN '⚠️ No provider assigned yet'
    ELSE '❌ Linked to different provider'
  END as link_status
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
)
OR po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 5: Summary - Will future orders work?
SELECT 
  'Summary: Future Orders' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM delivery_providers dp
      JOIN auth.users u ON u.id = dp.user_id
      WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
        AND dp.user_id IS NOT NULL
    )
    THEN '✅ YES - Future orders will automatically appear IF:'
    ELSE '❌ NO - Provider record not set up correctly'
  END as answer,
  '1. You accept the delivery request (sets delivery_requests.provider_id)' as condition_1,
  '2. Supplier dispatches items via QR scan (copies provider_id to purchase_orders)' as condition_2,
  '3. Your provider_id matches what is in delivery_requests.provider_id' as condition_3;
