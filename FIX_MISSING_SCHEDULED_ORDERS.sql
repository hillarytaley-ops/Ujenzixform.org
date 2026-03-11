-- ============================================================
-- FIX: Missing Scheduled Orders After Refresh
-- This ensures all orders appear in the schedule
-- ============================================================

-- Step 1: Check current provider ID resolution
SELECT 
  'Step 1: Provider ID Check' as section,
  u.id as your_user_id,
  u.email,
  dp.id as provider_id,
  CASE
    WHEN dp.id IS NOT NULL
    THEN '✅ Provider ID found'
    ELSE '❌ Provider ID NOT found - Will fix this'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: Find all orders that should be in your schedule
SELECT 
  'Step 2: Orders That Should Be Scheduled' as section,
  po.po_number,
  po.id as purchase_order_id,
  po.status as po_status,
  po.delivery_provider_id,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) as received_items
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE (
  -- Match by purchase_orders.delivery_provider_id
  po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
  -- OR match by delivery_requests.provider_id
  OR dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, dr.id, dr.provider_id, dr.status
HAVING COUNT(mi.id) > 0
ORDER BY po.created_at DESC;

-- Step 3: FIX - Ensure all orders have correct delivery_provider_id
-- This updates orders to use your provider ID
DO $$
DECLARE
  v_provider_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_count INTEGER;
BEGIN
  -- Find user by email (works in SQL Editor without auth.uid())
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email "taleyk@gmail.com" not found.';
  END IF;

  -- Get your provider ID
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider ID not found for user %. Please run FIX_FOR_TALEYK.sql first.', v_user_email;
  END IF;

  RAISE NOTICE 'Found provider ID: % for user: % (%)', v_provider_id, v_user_email, v_user_id;

  -- Update purchase_orders that are linked via delivery_requests but missing delivery_provider_id
  UPDATE purchase_orders po
  SET 
    delivery_provider_id = v_provider_id,
    updated_at = NOW()
  WHERE po.id IN (
    SELECT dr.purchase_order_id
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id
      AND dr.purchase_order_id IS NOT NULL
  )
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != v_provider_id)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % purchase_orders with delivery_provider_id', v_count;

  -- Also ensure delivery_requests have correct provider_id
  UPDATE delivery_requests dr
  SET 
    provider_id = v_provider_id,
    updated_at = NOW()
  WHERE dr.purchase_order_id IN (
    SELECT po.id
    FROM purchase_orders po
    WHERE po.delivery_provider_id = v_provider_id
  )
  AND (dr.provider_id IS NULL OR dr.provider_id != v_provider_id)
  AND dr.status NOT IN ('cancelled', 'completed', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % delivery_requests with provider_id', v_count;

  RAISE NOTICE '✅ Fix complete!';
END $$;

-- Step 4: Verify the fix
SELECT 
  'Step 4: Verification' as section,
  COUNT(*) as total_orders_in_rpc,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'in_transit') as in_transit_count,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'delivered') as delivered_count
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result;

-- Step 5: Show scheduled orders from RPC
SELECT 
  'Step 5: Scheduled Orders in RPC Result' as section,
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'_categorized_status' as status,
  result->>'_items_count' as items,
  result->>'_dispatched_count' as dispatched,
  result->>'_received_count' as received
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'_categorized_status' IN ('scheduled', 'in_transit')
ORDER BY result->>'updated_at' DESC NULLS LAST
LIMIT 20;
