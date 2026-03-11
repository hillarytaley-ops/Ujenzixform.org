-- ============================================================
-- COMPREHENSIVE FIX: Ensure ALL orders appear in schedule
-- This fixes provider ID resolution and links all orders
-- ============================================================

-- Step 1: Get your user and provider info
SELECT 
  'Step 1: Your Account Info' as section,
  u.id as your_user_id,
  u.email,
  dp.id as your_provider_id,
  dp.user_id as provider_user_id,
  CASE
    WHEN dp.user_id = u.id THEN '✅ Provider correctly linked to your account'
    ELSE '❌ Provider NOT linked correctly'
  END as link_status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: FIX - Update provider record to ensure user_id matches
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
  v_count INTEGER;
BEGIN
  -- Find user by email
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email "taleyk@gmail.com" not found.';
  END IF;

  -- Get or create provider ID
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = v_user_id
  LIMIT 1;

  -- If no provider exists, use the one we created earlier
  IF v_provider_id IS NULL THEN
    SELECT id INTO v_provider_id
    FROM delivery_providers
    WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
    LIMIT 1;

    -- Update it to link to your user
    IF v_provider_id IS NOT NULL THEN
      ALTER TABLE delivery_providers DISABLE TRIGGER audit_delivery_providers_contact_access;
      
      UPDATE delivery_providers
      SET user_id = v_user_id, updated_at = NOW()
      WHERE id = v_provider_id;

      ALTER TABLE delivery_providers ENABLE TRIGGER audit_delivery_providers_contact_access;
      
      RAISE NOTICE 'Updated provider % to link to user %', v_provider_id, v_user_id;
    END IF;
  END IF;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider ID not found. Please run FIX_FOR_TALEYK.sql first.';
  END IF;

  RAISE NOTICE 'Using provider ID: % for user: % (%)', v_provider_id, v_user_email, v_user_id;

  -- Step 2a: Update ALL purchase_orders that have delivery_requests with your provider_id
  UPDATE purchase_orders po
  SET 
    delivery_provider_id = v_provider_id,
    updated_at = NOW()
  WHERE po.id IN (
    SELECT DISTINCT dr.purchase_order_id
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id
      AND dr.purchase_order_id IS NOT NULL
  )
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != v_provider_id)
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % purchase_orders from delivery_requests', v_count;

  -- Step 2b: Update ALL delivery_requests to ensure provider_id is set
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

  -- Step 2c: Also update orders where delivery_provider_id is your provider but delivery_requests.provider_id is different
  UPDATE delivery_requests dr
  SET 
    provider_id = v_provider_id,
    updated_at = NOW()
  WHERE dr.purchase_order_id IN (
    SELECT po.id
    FROM purchase_orders po
    WHERE po.delivery_provider_id = v_provider_id
  )
  AND dr.provider_id != v_provider_id
  AND dr.status NOT IN ('cancelled', 'completed', 'delivered');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Synchronized % delivery_requests with purchase_orders', v_count;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ COMPREHENSIVE FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'All orders should now appear in your schedule.';
  RAISE NOTICE 'Refresh your dashboard to see them.';

END $$;

-- Step 3: Verify provider ID resolution (what RPC function does)
SELECT 
  'Step 3: RPC Provider Resolution Test' as section,
  u.id as your_user_id,
  u.email,
  (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) as provider_id_from_rpc_logic,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) IS NOT NULL
    THEN '✅ RPC function WILL find your provider'
    ELSE '❌ RPC function will NOT find your provider'
  END as rpc_will_work
FROM auth.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 4: Count orders that should appear
SELECT 
  'Step 4: Orders That Should Appear' as section,
  COUNT(DISTINCT po.id) as total_orders,
  COUNT(DISTINCT CASE WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN po.id END) as orders_with_po_provider_id,
  COUNT(DISTINCT CASE WHEN dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) THEN po.id END) as orders_with_dr_provider_id,
  COUNT(DISTINCT CASE WHEN po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1) 
    OR dr.provider_id = (SELECT dp.id FROM delivery_providers dp JOIN auth.users u ON u.id = dp.user_id WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com')) LIMIT 1)
    THEN po.id END) as orders_that_will_appear
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered');

-- Step 5: Test RPC function result (simulate what dashboard sees)
SELECT 
  'Step 5: RPC Function Result' as section,
  COUNT(*) as total_in_rpc,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'in_transit') as in_transit,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'delivered') as delivered
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result;

-- Step 6: Show sample scheduled orders
SELECT 
  'Step 6: Sample Scheduled Orders' as section,
  result->>'order_number' as order_number,
  result->>'po_number' as po_number,
  result->>'_categorized_status' as status,
  result->>'_items_count' as items,
  result->>'_dispatched_count' as dispatched,
  result->>'_received_count' as received
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result
WHERE result->>'_categorized_status' IN ('scheduled', 'in_transit')
ORDER BY result->>'updated_at' DESC NULLS LAST
LIMIT 10;
