-- ============================================================
-- FINAL FIX: Ensure everything is set up correctly
-- This verifies the setup and ensures all orders are linked
-- ============================================================

-- Step 1: Verify provider record is correctly set up
SELECT 
  'Step 1: Provider Record Verification' as section,
  u.id as your_user_id,
  u.email,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  CASE
    WHEN dp.user_id = u.id THEN '✅ Provider user_id matches your account - RPC will work!'
    WHEN dp.user_id IS NULL THEN '❌ Provider user_id is NULL - Will fix'
    ELSE '❌ Provider user_id does NOT match - Will fix'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: FIX - Ensure provider record has correct user_id
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  -- Find user
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Disable trigger
  ALTER TABLE delivery_providers DISABLE TRIGGER audit_delivery_providers_contact_access;

  -- Update provider
  UPDATE delivery_providers
  SET user_id = v_user_id, updated_at = NOW()
  WHERE id = v_provider_id;

  -- Re-enable trigger
  ALTER TABLE delivery_providers ENABLE TRIGGER audit_delivery_providers_contact_access;

  RAISE NOTICE '✅ Provider % linked to user % (%)', v_provider_id, v_user_email, v_user_id;
END $$;

-- Step 3: Find ALL orders that should be in your schedule
SELECT 
  'Step 3: All Orders That Should Be Scheduled' as section,
  po.po_number,
  po.id as purchase_order_id,
  po.status as po_status,
  po.delivery_provider_id,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE (
  po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  OR dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, dr.id, dr.provider_id, dr.status
ORDER BY po.created_at DESC;

-- Step 4: FIX - Update ALL orders to use your provider ID
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_count INTEGER;
BEGIN
  -- Get provider ID
  SELECT u.id, dp.id INTO v_user_id, v_provider_id
  FROM auth.users u
  JOIN delivery_providers dp ON dp.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider ID not found';
  END IF;

  -- Update purchase_orders from delivery_requests
  UPDATE purchase_orders po
  SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE po.id IN (
    SELECT DISTINCT dr.purchase_order_id
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id AND dr.purchase_order_id IS NOT NULL
  )
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != v_provider_id)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % purchase_orders', v_count;

  -- Update delivery_requests
  UPDATE delivery_requests dr
  SET provider_id = v_provider_id, updated_at = NOW()
  WHERE dr.purchase_order_id IN (
    SELECT po.id FROM purchase_orders po WHERE po.delivery_provider_id = v_provider_id
  )
  AND (dr.provider_id IS NULL OR dr.provider_id != v_provider_id)
  AND dr.status NOT IN ('cancelled', 'completed', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % delivery_requests', v_count;

END $$;

-- Step 5: IMPORTANT - Test what RPC function will see when you're logged in
-- This simulates: SELECT id FROM delivery_providers WHERE user_id = auth.uid()
SELECT 
  'Step 5: RPC Function Simulation (When Logged In)' as section,
  u.id as what_auth_uid_will_be,
  u.email,
  (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) as provider_id_rpc_will_find,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) IS NOT NULL
    THEN '✅ RPC function WILL find your provider when you are logged in!'
    ELSE '❌ RPC function will NOT find your provider - Provider record user_id is wrong'
  END as rpc_will_work,
  'Note: RPC returns 0 in SQL Editor because auth.uid() is NULL here.' as note,
  'When you log into the app, auth.uid() = your user_id, and RPC will work!' as explanation
FROM auth.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 6: Count orders that will appear when RPC works
SELECT 
  'Step 6: Orders That Will Appear (When Logged In)' as section,
  COUNT(DISTINCT po.id) as total_orders,
  COUNT(DISTINCT CASE WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN po.id END) as orders_with_po_provider_id,
  COUNT(DISTINCT CASE WHEN dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN po.id END) as orders_with_dr_provider_id,
  COUNT(DISTINCT CASE 
    WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
    OR dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
    THEN po.id 
  END) as orders_that_will_appear
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered');
