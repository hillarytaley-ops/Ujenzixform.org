-- ============================================================
-- FIX: Link Provider to User by Email
-- Run this and replace 'your-email@example.com' with your actual email
-- ============================================================

-- Step 1: Find your user_id by email
-- REPLACE 'your-email@example.com' with your actual login email
SELECT 
  'Step 1: Find Your User' as section,
  u.id as your_user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'user_type' as user_type
FROM auth.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('your-email@example.com'))  -- REPLACE THIS
LIMIT 1;

-- Step 2: Check if you have a delivery_providers record
-- REPLACE 'your-email@example.com' with your actual login email
SELECT 
  'Step 2: Your Provider Record' as section,
  dp.id as provider_id,
  dp.user_id,
  dp.provider_name,
  dp.email,
  CASE
    WHEN dp.id IS NULL THEN '❌ NO PROVIDER RECORD FOUND'
    ELSE '✅ PROVIDER RECORD EXISTS'
  END as status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('your-email@example.com'))  -- REPLACE THIS
LIMIT 1;

-- Step 3: Check what provider the orders are assigned to
SELECT 
  'Step 3: Orders Provider' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  dp.email as provider_email
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.id = COALESCE(po.delivery_provider_id, dr.provider_id)
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- ============================================================
-- FIX: Run this after replacing the email
-- ============================================================

-- OPTION A: Update existing provider f783939a-f7f1-4c78-a9a3-295e55fa4956 to link to your user
-- REPLACE 'your-email@example.com' with your actual login email
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
BEGIN
  -- Get your user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('your-email@example.com'))  -- REPLACE THIS
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please check your email address.';
  END IF;

  -- Update provider to link to your user
  UPDATE delivery_providers
  SET 
    user_id = v_user_id,
    updated_at = NOW()
  WHERE id = v_provider_id;

  -- Update orders to use this provider
  UPDATE purchase_orders
  SET 
    delivery_provider_id = v_provider_id,
    updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  -- Update delivery_requests
  UPDATE delivery_requests
  SET 
    provider_id = v_provider_id,
    updated_at = NOW()
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  );

  RAISE NOTICE '✅ Updated provider % to link to user %', v_provider_id, v_user_id;
END $$;

-- OPTION B: Create a new provider for your user and update orders
-- REPLACE 'your-email@example.com' with your actual login email
/*
DO $$
DECLARE
  v_user_id UUID;
  v_new_provider_id UUID := gen_random_uuid();
BEGIN
  -- Get your user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('your-email@example.com'))  -- REPLACE THIS
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please check your email address.';
  END IF;

  -- Create new provider
  INSERT INTO delivery_providers (
    id,
    user_id,
    provider_name,
    provider_type,
    phone,
    email,
    is_active,
    is_verified,
    created_at,
    updated_at
  )
  SELECT 
    v_new_provider_id,
    v_user_id,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'),
    'individual',
    COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'),
    u.email,
    true,
    true,
    NOW(),
    NOW()
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- Update orders
  UPDATE purchase_orders
  SET 
    delivery_provider_id = v_new_provider_id,
    updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  -- Update delivery_requests
  UPDATE delivery_requests
  SET 
    provider_id = v_new_provider_id,
    updated_at = NOW()
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  );

  RAISE NOTICE '✅ Created provider % for user %', v_new_provider_id, v_user_id;
END $$;
*/

-- Step 4: Final Verification
-- REPLACE 'your-email@example.com' with your actual login email
SELECT 
  'Final Verification' as section,
  u.id as your_user_id,
  u.email,
  dp.id as your_provider_id,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as dr_provider_id,
  CASE
    WHEN po.delivery_provider_id = dp.id OR dr.provider_id = dp.id THEN '✅ MATCHES'
    ELSE '❌ DOES NOT MATCH'
  END as match_status
FROM auth.users u
LEFT JOIN delivery_providers dp ON dp.user_id = u.id
CROSS JOIN purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('your-email@example.com'))  -- REPLACE THIS
  AND po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
