-- ============================================================
-- SIMPLE FIX - Choose Your User
-- Run ONE of the options below based on which account you're using
-- ============================================================

-- ============================================================
-- OPTION 1: If you are delivery@test.com
-- ============================================================
DO $$
DECLARE
  v_user_id UUID := '95879f60-abb2-4996-a725-b16fc198742f'::uuid;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE 'Fixing for: % (%)', v_user_email, v_user_id;

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

-- ============================================================
-- OPTION 2: If you are markkip@gmail.com
-- Uncomment the block below and comment out Option 1 above
-- ============================================================
/*
DO $$
DECLARE
  v_user_id UUID := '77e8a153-3b0a-45e2-b86c-dffa93e080b1'::uuid;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE 'Fixing for: % (%)', v_user_email, v_user_id;

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

-- ============================================================
-- OPTION 3: If you are a different user
-- Replace the user_id below with your user_id from the list:
-- - samiasulu@gmail.com: 42254b70-7e77-4c03-86b0-cff9234743a0
-- - otienot@gmail.com: 904b4e47-38f0-4115-acfc-fada3bb3d34e
-- - private@test.com: 79ed7e17-ca67-4a00-9aa7-2fc4007b020c
-- - supplier@test.com: 59938adb-3815-4ded-8058-051aa13204c6
-- - profbuilder@test.com: 2677ee7f-818c-4490-a50f-0a422e5a55cc
-- - wallsjeb@gmail.com: 2a1c3179-5c49-4c0b-a5a8-14dc1808a991
-- - wallsjep@gmail.com: 123ae178-85ad-4b0c-b4c6-f3ad3c4bad4f
-- - test@gmail.com: 46dfe79c-590b-4451-a51f-f2b5840531bf
-- ============================================================
/*
DO $$
DECLARE
  v_user_id UUID := 'PASTE_YOUR_USER_ID_HERE'::uuid;  -- Replace with your user_id
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE 'Fixing for: % (%)', v_user_email, v_user_id;

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
