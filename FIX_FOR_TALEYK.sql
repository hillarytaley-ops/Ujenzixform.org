-- ============================================================
-- FIX FOR: taleyk@gmail.com
-- This will link the orders to your delivery provider account
-- ============================================================

-- Step 1: Find your user_id
SELECT 
  'Step 1: Find Your User' as section,
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  dp.id as existing_provider_id,
  CASE
    WHEN dp.id IS NOT NULL THEN '✅ Already has provider record'
    ELSE '❌ No provider record - will create one'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
LIMIT 1;

-- Step 2: Apply the fix
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
    RAISE EXCEPTION '❌ User with email "taleyk@gmail.com" not found. Please check the email address.';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Linking provider % to user...', v_provider_id;

  -- Create or update provider record
  -- First check if it exists, then update or insert accordingly
  IF EXISTS (SELECT 1 FROM delivery_providers WHERE id = v_provider_id) THEN
    -- Update existing record
    UPDATE delivery_providers
    SET 
      user_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_provider_id;
    RAISE NOTICE '✅ Updated existing provider record';
  ELSE
    -- Insert new record
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
    RAISE NOTICE '✅ Created new provider record';
  END IF;

  RAISE NOTICE '✅ Provider record created/updated';

  -- Update purchase_orders
  UPDATE purchase_orders
  SET 
    delivery_provider_id = v_provider_id,
    updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  RAISE NOTICE '✅ Updated purchase_orders';

  -- Update delivery_requests
  UPDATE delivery_requests
  SET 
    provider_id = v_provider_id,
    updated_at = NOW()
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  );

  RAISE NOTICE '✅ Updated delivery_requests';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Orders should now appear in your delivery dashboard.';
  RAISE NOTICE 'Refresh your browser to see them.';
END $$;

-- Step 3: Verify the fix
SELECT 
  'Step 3: Verification' as section,
  u.id as your_user_id,
  u.email as your_email,
  dp.id as your_provider_id,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as dr_provider_id,
  CASE
    WHEN po.delivery_provider_id = dp.id OR dr.provider_id = dp.id THEN '✅ MATCHES - Orders will appear!'
    ELSE '❌ DOES NOT MATCH'
  END as match_status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
CROSS JOIN purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('taleyk@gmail.com'))
  AND po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
