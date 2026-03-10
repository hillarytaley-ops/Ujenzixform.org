-- ============================================================
-- IDENTIFY YOUR DELIVERY PROVIDER ACCOUNT AND FIX
-- ============================================================

-- Step 1: Check which users have delivery provider records
SELECT 
  'Delivery Provider Accounts' as section,
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  dp.id as provider_id,
  dp.provider_name,
  CASE
    WHEN dp.id IS NOT NULL THEN '✅ Has provider record'
    ELSE '❌ No provider record'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE u.email IN (
  'markkip@gmail.com',
  'samiasulu@gmail.com',
  'otienot@gmail.com',
  'private@test.com',
  'delivery@test.com',
  'supplier@test.com',
  'profbuilder@test.com',
  'wallsjeb@gmail.com',
  'wallsjep@gmail.com',
  'test@gmail.com'
)
ORDER BY 
  CASE WHEN dp.id IS NOT NULL THEN 0 ELSE 1 END,
  u.email;

-- Step 2: Check which provider the orders are assigned to
SELECT 
  'Orders Provider Assignment' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  u.email as provider_user_email,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ Provider linked to: ' || u.email
    ELSE '❌ Provider not linked to any user'
  END as status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.id = COALESCE(po.delivery_provider_id, dr.provider_id)
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- ============================================================
-- STEP 3: FIX FOR SPECIFIC USERS
-- Choose the user you want to link the orders to
-- ============================================================

-- OPTION A: Fix for delivery@test.com
-- Uncomment and run this if you are delivery@test.com:
/*
DO $$
DECLARE
  v_user_id_text TEXT := '95879f60-abb2-4996-a725-b16fc198742f';
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  v_user_id := v_user_id_text::uuid;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  RAISE NOTICE 'Fixing for user: % (%)', v_user_email, v_user_id;

  INSERT INTO delivery_providers (id, user_id, provider_name, provider_type, phone, email, is_active, is_verified, created_at, updated_at)
  SELECT v_provider_id, v_user_id, COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'), 'individual', COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'), COALESCE(u.email, ''), true, true, NOW(), NOW()
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW();

  UPDATE purchase_orders SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  UPDATE delivery_requests SET provider_id = v_provider_id, updated_at = NOW()
  WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS'));

  RAISE NOTICE '✅ FIX COMPLETE for %', v_user_email;
END $$;
*/

-- OPTION B: Fix for markkip@gmail.com
-- Uncomment and run this if you are markkip@gmail.com:
/*
DO $$
DECLARE
  v_user_id_text TEXT := '77e8a153-3b0a-45e2-b86c-dffa93e080b1';
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  v_user_id := v_user_id_text::uuid;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  RAISE NOTICE 'Fixing for user: % (%)', v_user_email, v_user_id;

  INSERT INTO delivery_providers (id, user_id, provider_name, provider_type, phone, email, is_active, is_verified, created_at, updated_at)
  SELECT v_provider_id, v_user_id, COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'), 'individual', COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'), COALESCE(u.email, ''), true, true, NOW(), NOW()
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW();

  UPDATE purchase_orders SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  UPDATE delivery_requests SET provider_id = v_provider_id, updated_at = NOW()
  WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS'));

  RAISE NOTICE '✅ FIX COMPLETE for %', v_user_email;
END $$;
*/

-- OPTION C: Generic fix - Replace 'YOUR_USER_ID_HERE' with any user_id from the list above
DO $$
DECLARE
  v_user_id_text TEXT := 'YOUR_USER_ID_HERE';  -- Replace with one of the user_ids from Step 1
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  IF v_user_id_text = 'YOUR_USER_ID_HERE' THEN
    RAISE EXCEPTION '❌ ERROR: You must replace "YOUR_USER_ID_HERE" with your actual user_id!';
  END IF;

  BEGIN
    v_user_id := v_user_id_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ ERROR: Invalid UUID format: %', v_user_id_text;
  END;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User ID % not found', v_user_id;
  END IF;

  RAISE NOTICE 'Fixing for user: % (%)', v_user_email, v_user_id;

  INSERT INTO delivery_providers (id, user_id, provider_name, provider_type, phone, email, is_active, is_verified, created_at, updated_at)
  SELECT v_provider_id, v_user_id, COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'), 'individual', COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'), COALESCE(u.email, ''), true, true, NOW(), NOW()
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW();

  UPDATE purchase_orders SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  UPDATE delivery_requests SET provider_id = v_provider_id, updated_at = NOW()
  WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS'));

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

-- Step 4: Final Verification
SELECT 
  'Final Verification' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  u.email as provider_user_email,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ Provider linked to user'
    ELSE '❌ Provider not linked'
  END as status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.id = COALESCE(po.delivery_provider_id, dr.provider_id)
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
