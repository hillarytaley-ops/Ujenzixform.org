-- ============================================================
-- DIAGNOSE: Provider and Order Status (No Auth Required)
-- This will show what's happening without needing auth.uid()
-- ============================================================

-- Step 1: Check the provider ID that orders are assigned to
SELECT 
  'Provider Info' as section,
  dp.id as provider_id,
  dp.user_id,
  dp.provider_name,
  dp.email,
  dp.phone,
  u.email as user_email,
  u.id as auth_user_id,
  CASE
    WHEN dp.user_id IS NULL THEN '⚠️ Provider exists but NO user_id'
    WHEN u.id IS NULL THEN '⚠️ Provider user_id does not match any auth user'
    ELSE '✅ Provider is linked to user: ' || u.email
  END as status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE dp.id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956';

-- Step 2: Check the orders
SELECT 
  'Order Info' as section,
  po.po_number,
  po.id as purchase_order_id,
  po.delivery_provider_id,
  po.status as po_status,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 3: List all delivery providers to see what's available
SELECT 
  'All Providers' as section,
  dp.id,
  dp.user_id,
  dp.provider_name,
  dp.email,
  u.email as user_email,
  u.id as auth_user_id
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
ORDER BY dp.created_at DESC
LIMIT 10;

-- Step 4: Check delivery_provider_registrations for clues
SELECT 
  'Registrations' as section,
  dpr.id,
  dpr.auth_user_id,
  dpr.full_name,
  dpr.email,
  dpr.status,
  u.email as user_email
FROM delivery_provider_registrations dpr
LEFT JOIN auth.users u ON u.id = dpr.auth_user_id
WHERE dpr.status = 'approved'
ORDER BY dpr.created_at DESC
LIMIT 10;

-- ============================================================
-- MANUAL FIX OPTIONS (Run these after identifying your user_id)
-- ============================================================

-- OPTION A: If you know your user_id, replace 'YOUR_USER_ID_HERE' with it
-- This will create/update a provider record for you
/*
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
VALUES (
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid,
  'YOUR_USER_ID_HERE'::uuid,  -- REPLACE THIS
  'Delivery Provider',
  'individual',
  '+254000000000',
  'your-email@example.com',  -- REPLACE THIS
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  user_id = EXCLUDED.user_id,
  updated_at = NOW();
*/

-- OPTION B: If provider exists but has wrong user_id, update it
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id
/*
UPDATE delivery_providers
SET 
  user_id = 'YOUR_USER_ID_HERE'::uuid,  -- REPLACE THIS
  updated_at = NOW()
WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956';
*/

-- OPTION C: Create a new provider and update orders to use it
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id
/*
DO $$
DECLARE
  v_new_provider_id UUID := gen_random_uuid();
  v_user_id UUID := 'YOUR_USER_ID_HERE'::uuid;  -- REPLACE THIS
BEGIN
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
    COALESCE(u.email, ''),
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

  RAISE NOTICE '✅ Created provider % and updated orders', v_new_provider_id;
END $$;
*/
