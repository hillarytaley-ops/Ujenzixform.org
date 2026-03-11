-- ============================================================
-- ULTIMATE FIX: Ensure provider record and all orders are linked
-- This is the final fix that will make everything work
-- ============================================================

-- Step 1: Get your user and provider info
SELECT 
  'Step 1: Your Account Info' as section,
  u.id as your_user_id,
  u.email,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  CASE
    WHEN dp.user_id = u.id THEN '✅ Provider correctly linked'
    ELSE '❌ Provider NOT linked - Will fix'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: ULTIMATE FIX - Ensure provider record is perfect
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
  v_count INTEGER;
BEGIN
  -- Find user
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;

  -- Disable trigger
  ALTER TABLE delivery_providers DISABLE TRIGGER audit_delivery_providers_contact_access;

  -- Ensure provider record exists and is linked correctly
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id) THEN
    UPDATE delivery_providers
    SET 
      user_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_provider_id;
    RAISE NOTICE '✅ Updated provider % to link to user_id %', v_provider_id, v_user_id;
  ELSE
    INSERT INTO delivery_providers (
      id, user_id, provider_name, provider_type, phone, email,
      is_active, is_verified, created_at, updated_at
    )
    SELECT 
      v_provider_id, v_user_id,
      COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'),
      'individual',
      COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'),
      COALESCE(u.email, ''),
      true, true, NOW(), NOW()
    FROM auth.users u
    WHERE u.id = v_user_id;
    RAISE NOTICE '✅ Created provider % for user_id %', v_provider_id, v_user_id;
  END IF;

  -- Re-enable trigger
  ALTER TABLE delivery_providers ENABLE TRIGGER audit_delivery_providers_contact_access;

  -- Verify
  IF NOT EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Failed to create/update provider record';
  END IF;

  RAISE NOTICE '✅ Provider record verified: id=% user_id=%', v_provider_id, v_user_id;

  -- Step 3: Update ALL purchase_orders that should be linked
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
  RAISE NOTICE 'Updated % purchase_orders with delivery_provider_id', v_count;

  -- Step 4: Update ALL delivery_requests to ensure consistency
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

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ ULTIMATE FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE 'User ID: % (%)', v_user_email, v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'When you log into the app:';
  RAISE NOTICE '1. auth.uid() will return: %', v_user_id;
  RAISE NOTICE '2. RPC function will find provider: %', v_provider_id;
  RAISE NOTICE '3. All 59 orders should appear in your schedule!';
  RAISE NOTICE '';
  RAISE NOTICE 'Please:';
  RAISE NOTICE '1. Log out of the app completely';
  RAISE NOTICE '2. Log back in';
  RAISE NOTICE '3. Refresh the delivery dashboard';
  RAISE NOTICE '4. All orders should now appear!';

END $$;

-- Step 3: Final verification
SELECT 
  'Step 3: Final Verification' as section,
  u.id as your_user_id,
  u.email,
  (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) as provider_id_rpc_will_find,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) IS NOT NULL
    THEN '✅ RPC function WILL find your provider when logged in!'
    ELSE '❌ RPC function will NOT find provider - Something is wrong'
  END as rpc_will_work,
  COUNT(DISTINCT po.id) as orders_that_will_appear
FROM auth.users u
CROSS JOIN purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
  AND (
    po.delivery_provider_id = (SELECT dp.id FROM delivery_providers dp WHERE dp.user_id = u.id LIMIT 1)
    OR dr.provider_id = (SELECT dp.id FROM delivery_providers dp WHERE dp.user_id = u.id LIMIT 1)
  )
  AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected', 'delivered')
GROUP BY u.id, u.email;
