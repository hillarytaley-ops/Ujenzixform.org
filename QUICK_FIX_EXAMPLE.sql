-- ============================================================
-- QUICK FIX EXAMPLE
-- Copy this and replace the user_id with your actual user_id
-- ============================================================

-- Step 1: First run this to see all users and find your user_id
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: After you find your user_id, copy this entire block
-- and replace 'PASTE_YOUR_USER_ID_HERE' with your actual user_id
-- Example: If your user_id is '123e4567-e89b-12d3-a456-426614174000'
-- Then use: v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000'::uuid;

DO $$
DECLARE
  v_user_id UUID := 'PASTE_YOUR_USER_ID_HERE'::uuid;  -- ⚠️ REPLACE THIS!
  v_provider_id UUID := 'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid;
  v_user_email TEXT;
BEGIN
  -- Safety check
  IF v_user_id::text = 'PASTE_YOUR_USER_ID_HERE' THEN
    RAISE EXCEPTION '❌ You must replace PASTE_YOUR_USER_ID_HERE with your actual user_id!';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User ID % not found', v_user_id;
  END IF;

  RAISE NOTICE 'Fixing for user: % (%)', v_user_email, v_user_id;

  -- Update/create provider
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
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE
  SET user_id = EXCLUDED.user_id, updated_at = NOW();

  -- Update orders
  UPDATE purchase_orders
  SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

  -- Update delivery_requests
  UPDATE delivery_requests
  SET provider_id = v_provider_id, updated_at = NOW()
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  );

  RAISE NOTICE '✅ FIX COMPLETE! Orders should now appear in your dashboard.';
END $$;
