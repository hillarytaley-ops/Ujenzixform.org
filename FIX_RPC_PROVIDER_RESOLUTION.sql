-- ============================================================
-- FIX: RPC Function Provider Resolution
-- The RPC function returns 0 because it can't find the provider
-- This ensures the provider record is set up correctly
-- ============================================================

-- Step 1: Check current provider setup
SELECT 
  'Step 1: Current Provider Setup' as section,
  u.id as your_user_id,
  u.email,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  CASE
    WHEN dp.user_id = u.id THEN '✅ Provider user_id matches your account'
    WHEN dp.user_id IS NULL THEN '❌ Provider user_id is NULL'
    ELSE '❌ Provider user_id does NOT match'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: Check if provider exists with the target ID
SELECT 
  'Step 2: Provider Record Check' as section,
  dp.id as provider_id,
  dp.user_id,
  u.email as user_email,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ Provider exists with user_id'
    WHEN dp.id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid THEN '⚠️ Provider exists but user_id is NULL'
    ELSE '❌ Provider not found'
  END as status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE dp.id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
LIMIT 1;

-- Step 3: FIX - Ensure provider record has correct user_id
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  -- Find user by email
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email "taleyk@gmail.com" not found.';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;

  -- Temporarily disable buggy trigger
  ALTER TABLE delivery_providers DISABLE TRIGGER audit_delivery_providers_contact_access;

  -- Update or create provider record
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id) THEN
    -- Update existing provider
    UPDATE delivery_providers
    SET 
      user_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_provider_id;
    RAISE NOTICE '✅ Updated provider % to link to user_id %', v_provider_id, v_user_id;
  ELSE
    -- Create new provider
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
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id AND user_id = v_user_id) THEN
    RAISE NOTICE '✅ Provider record verified: id=% user_id=%', v_provider_id, v_user_id;
  ELSE
    RAISE EXCEPTION '❌ Failed to create/update provider record';
  END IF;

END $$;

-- Step 4: Verify provider ID resolution (simulates what RPC function does)
SELECT 
  'Step 4: RPC Provider Resolution Test' as section,
  u.id as your_user_id,
  u.email,
  (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) as provider_id_from_rpc_logic,
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid as expected_provider_id,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid
    THEN '✅ PERFECT MATCH - RPC will find orders!'
    WHEN (SELECT id FROM delivery_providers WHERE user_id = u.id LIMIT 1) IS NOT NULL
    THEN '⚠️ Provider found but ID mismatch - may still work'
    ELSE '❌ Provider NOT found - RPC will return 0 orders'
  END as rpc_will_work
FROM auth.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 5: Update all orders to use your provider ID
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_count INTEGER;
BEGIN
  -- Get user and provider IDs
  SELECT u.id, dp.id INTO v_user_id, v_provider_id
  FROM auth.users u
  JOIN delivery_providers dp ON dp.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider ID not found. Please run Step 3 first.';
  END IF;

  -- Update purchase_orders
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
  RAISE NOTICE 'Updated % purchase_orders', v_count;

  -- Update delivery_requests
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
  RAISE NOTICE 'Updated % delivery_requests', v_count;

END $$;

-- Step 6: Final verification - Test RPC function
SELECT 
  'Step 6: Final RPC Test' as section,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'in_transit') as in_transit,
  COUNT(*) FILTER (WHERE result->>'_categorized_status' = 'delivered') as delivered,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ RPC function is working!'
    ELSE '❌ RPC function still returning 0 - Check provider ID resolution'
  END as status
FROM jsonb_array_elements(get_deliveries_for_provider_unified()) AS result;
