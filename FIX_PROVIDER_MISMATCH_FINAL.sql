-- ============================================================
-- FIX: Provider Mismatch - Make sure RPC function finds your provider
-- ============================================================

-- Step 1: Check current situation
SELECT 
  'Current Situation' as section,
  auth.uid() as your_auth_uid,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as provider_id_from_rpc_lookup,
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid as target_provider_id,
  (SELECT user_id FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956' LIMIT 1) as target_provider_user_id,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid
    THEN '✅ Provider ID matches - RPC will find it'
    ELSE '❌ Provider ID mismatch - RPC will not find orders'
  END as rpc_match_status;

-- Step 2: Get your actual user_id from email
SELECT 
  'Your User Info' as section,
  u.id as your_user_id,
  u.email,
  dp.id as your_provider_id,
  dp.user_id as provider_user_id
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 3: Fix - Ensure provider record exists with correct user_id
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
    RAISE EXCEPTION '❌ User with email "taleyk@gmail.com" not found.';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Target provider ID: %', v_provider_id;

  -- Temporarily disable buggy trigger
  ALTER TABLE delivery_providers DISABLE TRIGGER audit_delivery_providers_contact_access;

  -- Update or create provider record with the correct user_id
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id) THEN
    -- Update existing provider to link to your user_id
    UPDATE delivery_providers
    SET 
      user_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_provider_id;
    RAISE NOTICE '✅ Updated provider % to link to user_id %', v_provider_id, v_user_id;
  ELSE
    -- Create new provider record
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

  -- Verify the provider record
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id AND user_id = v_user_id) THEN
    RAISE NOTICE '✅ Provider record verified: id=% user_id=%', v_provider_id, v_user_id;
  ELSE
    RAISE EXCEPTION '❌ Failed to create/update provider record';
  END IF;

END $$;

-- Step 4: Verify provider ID resolution (this is what RPC function does)
SELECT 
  'Provider ID Resolution (RPC Logic)' as section,
  auth.uid() as current_auth_uid,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as provider_id_from_rpc,
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid as orders_provider_id,
  CASE
    WHEN (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid
    THEN '✅ MATCH - RPC will find orders'
    ELSE '❌ NO MATCH - RPC will not find orders'
  END as rpc_will_find_orders;

-- Step 5: Final verification - Check if orders would pass filters
SELECT 
  'Final Filter Check' as section,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as rpc_provider_id,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
    THEN '✅ Will appear in RPC result'
    WHEN EXISTS (
      SELECT 1 FROM delivery_requests dr 
      WHERE dr.purchase_order_id = po.id 
        AND dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
    )
    THEN '✅ Will appear via delivery_requests'
    ELSE '❌ Will NOT appear'
  END as will_appear_in_schedule
FROM purchase_orders po
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
