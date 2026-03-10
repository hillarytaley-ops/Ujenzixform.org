-- ============================================================
-- STEP 1: Find Your User - Run this first to see all users
-- ============================================================

-- List all users (to help you find your email)
SELECT 
  'All Users' as section,
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'user_type' as user_type,
  u.created_at
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 20;

-- ============================================================
-- STEP 2: Find delivery providers and their linked users
-- ============================================================

SELECT 
  'Delivery Providers' as section,
  dp.id as provider_id,
  dp.user_id,
  dp.provider_name,
  dp.email as provider_email,
  u.email as user_email,
  CASE
    WHEN dp.user_id IS NULL THEN '⚠️ No user linked'
    WHEN u.id IS NULL THEN '⚠️ User not found'
    ELSE '✅ Linked to: ' || u.email
  END as status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
ORDER BY dp.created_at DESC
LIMIT 20;

-- ============================================================
-- STEP 3: Check the orders and their provider assignment
-- ============================================================

SELECT 
  'Orders Status' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  u.email as provider_user_email
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.id = COALESCE(po.delivery_provider_id, dr.provider_id)
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- ============================================================
-- STEP 4: FIX - Use this after you find your user_id
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with the actual UUID from Step 1
-- Example: v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000'::uuid;
-- ============================================================

DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE'::uuid;  -- ⚠️ REPLACE THIS with your user_id from Step 1
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  -- Check if placeholder was replaced
  IF v_user_id::text = 'YOUR_USER_ID_HERE' THEN
    RAISE EXCEPTION '❌ ERROR: You must replace "YOUR_USER_ID_HERE" with your actual user_id from Step 1!';
  END IF;

  -- Verify user exists
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User ID % not found. Please check Step 1 to find your correct user_id.', v_user_id;
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;

  -- Update or create provider record
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
    v_provider_id,
    v_user_id,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'),
    'individual',
    COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'),
    COALESCE(u.email, ''),
    true,
    true,
    NOW(),
    NOW()
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE
  SET 
    user_id = EXCLUDED.user_id,
    updated_at = NOW();

  RAISE NOTICE '✅ Updated provider % to link to user %', v_provider_id, v_user_id;

  -- Update orders
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
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'User Email: %', v_user_email;
  RAISE NOTICE '';
  RAISE NOTICE 'Orders should now appear in your delivery schedule.';
  RAISE NOTICE 'Refresh your delivery dashboard to see them.';

END $$;

-- ============================================================
-- STEP 5: Verify the fix worked
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id from Step 1
-- ============================================================

-- First, let's see if the orders are now linked correctly
SELECT 
  'Verification - Orders' as section,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  u.email as provider_user_email,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ Provider has user_id'
    ELSE '❌ Provider missing user_id'
  END as provider_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.id = COALESCE(po.delivery_provider_id, dr.provider_id)
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Now verify for your specific user (replace YOUR_USER_ID_HERE)
-- Uncomment and replace YOUR_USER_ID_HERE with your actual user_id:
/*
SELECT 
  'Verification - Your Account' as section,
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
WHERE u.id = 'YOUR_USER_ID_HERE'::uuid  -- REPLACE THIS with your user_id
  AND po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
*/