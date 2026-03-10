-- ============================================================
-- DIAGNOSE AND FIX: Missing Delivery Provider Record
-- This will diagnose why you don't have a provider record and fix it
-- ============================================================

-- Step 1: Check current user info
SELECT 
  'Step 1: Current User' as section,
  auth.uid() as current_user_id,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_full_name,
  u.raw_user_meta_data->>'user_type' as user_type
FROM auth.users u
WHERE u.id = auth.uid();

-- Step 2: Check if delivery_providers record exists for current user
SELECT 
  'Step 2: Delivery Provider Record' as section,
  dp.id as provider_id,
  dp.user_id,
  dp.provider_name,
  dp.provider_type,
  dp.email,
  dp.phone,
  CASE
    WHEN dp.id IS NULL THEN '❌ NO RECORD FOUND'
    ELSE '✅ RECORD EXISTS'
  END as status
FROM delivery_providers dp
WHERE dp.user_id = auth.uid()
LIMIT 1;

-- Step 3: Check what provider the orders are assigned to
SELECT 
  'Step 3: Orders Provider Info' as section,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as delivery_request_provider_id,
  dp_orders.id as provider_id_from_orders,
  dp_orders.user_id as provider_user_id,
  dp_orders.provider_name,
  dp_orders.email as provider_email
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp_orders ON dp_orders.id = COALESCE(po.delivery_provider_id, dr.provider_id)
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 4: Check if provider ID f783939a-f7f1-4c78-a9a3-295e55fa4956 exists and what user it belongs to
SELECT 
  'Step 4: Target Provider Details' as section,
  dp.id as provider_id,
  dp.user_id as provider_user_id,
  dp.provider_name,
  dp.email as provider_email,
  u.email as user_email,
  CASE
    WHEN dp.user_id = auth.uid() THEN '✅ This is YOUR provider ID'
    WHEN dp.user_id IS NULL THEN '⚠️ Provider exists but no user_id'
    ELSE '❌ This provider belongs to a different user'
  END as ownership_status
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE dp.id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956';

-- Step 5: Check delivery_provider_registrations for current user
SELECT 
  'Step 5: Registration Record' as section,
  dpr.id,
  dpr.auth_user_id,
  dpr.full_name,
  dpr.email,
  dpr.status,
  CASE
    WHEN dpr.id IS NULL THEN '❌ NO REGISTRATION FOUND'
    WHEN LOWER(TRIM(dpr.status)) = 'approved' THEN '✅ APPROVED REGISTRATION'
    ELSE '⚠️ Registration exists but not approved: ' || dpr.status
  END as registration_status
FROM delivery_provider_registrations dpr
WHERE dpr.auth_user_id = auth.uid()
LIMIT 1;

-- Step 6: FIX OPTION A - If provider f783939a-f7f1-4c78-a9a3-295e55fa4956 belongs to current user, update it
-- This updates the provider record to link to current user if it's orphaned
UPDATE delivery_providers
SET 
  user_id = auth.uid(),
  updated_at = NOW()
WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
  AND (user_id IS NULL OR user_id != auth.uid())
  AND EXISTS (
    -- Only update if there's no other provider record for this user
    SELECT 1 FROM delivery_providers dp2 
    WHERE dp2.user_id = auth.uid() 
    HAVING COUNT(*) = 0
  );

-- Step 7: FIX OPTION B - Create a new provider record for current user if none exists
-- This creates a minimal provider record linked to current user
INSERT INTO delivery_providers (
  id,
  user_id,
  provider_name,
  provider_type,
  email,
  phone,
  is_active,
  is_verified,
  created_at,
  updated_at
)
SELECT 
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid, -- Use the same ID as the orders
  auth.uid(),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'),
  'individual',
  u.email,
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  true,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM delivery_providers WHERE user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
  )
ON CONFLICT (id) DO UPDATE
SET 
  user_id = auth.uid(),
  updated_at = NOW()
WHERE delivery_providers.user_id IS NULL OR delivery_providers.user_id != auth.uid();

-- Step 8: FIX OPTION C - If provider exists but belongs to different user, update orders to use current user's provider
-- First, create/get provider record for current user
DO $$
DECLARE
  v_current_provider_id UUID;
BEGIN
  -- Get or create provider ID for current user
  SELECT id INTO v_current_provider_id
  FROM delivery_providers
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- If no provider exists, create one
  IF v_current_provider_id IS NULL THEN
    INSERT INTO delivery_providers (
      user_id,
      provider_name,
      provider_type,
      email,
      phone,
      is_active,
      is_verified,
      created_at,
      updated_at
    )
    SELECT 
      auth.uid(),
      COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider'),
      'individual',
      u.email,
      COALESCE(u.raw_user_meta_data->>'phone', ''),
      true,
      true,
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.id = auth.uid()
    RETURNING id INTO v_current_provider_id;
  END IF;

  -- Update orders to use current user's provider ID
  UPDATE purchase_orders
  SET 
    delivery_provider_id = v_current_provider_id,
    updated_at = NOW()
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
    AND delivery_provider_id != v_current_provider_id;

  -- Update delivery_requests to use current user's provider ID
  UPDATE delivery_requests
  SET 
    provider_id = v_current_provider_id,
    updated_at = NOW()
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  )
  AND provider_id != v_current_provider_id;
END $$;

-- Step 9: Final Verification
SELECT 
  'Step 9: Final Verification' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  dp.id as your_provider_id,
  dp.user_id,
  CASE
    WHEN po.delivery_provider_id = dp.id OR dr.provider_id = dp.id THEN '✅ MATCHES YOUR PROVIDER ID'
    ELSE '❌ STILL DOES NOT MATCH'
  END as match_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp ON dp.user_id = auth.uid()
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
