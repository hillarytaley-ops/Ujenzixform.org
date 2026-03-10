-- ============================================================
-- SIMPLE FIX: Create/Update Delivery Provider Record
-- This will definitely create a provider record for you
-- ============================================================

-- Step 1: Check current situation
SELECT 
  'Before Fix' as section,
  auth.uid() as your_user_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as your_provider_id,
  (SELECT id FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956' LIMIT 1) as target_provider_id,
  (SELECT user_id FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956' LIMIT 1) as target_provider_user_id;

-- Step 2: Update existing provider record to link to current user (if it exists)
UPDATE delivery_providers
SET 
  user_id = auth.uid(),
  updated_at = NOW()
WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
  AND (user_id IS NULL OR user_id != auth.uid());

-- Step 3: If provider doesn't exist, create it with the target ID
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
  'f783939a-f7f1-4c78-a9a3-295e55fa4956'::uuid,
  auth.uid(),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider', 'Unknown Provider'),
  'individual',
  COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'),
  COALESCE(u.email, ''),
  true,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM delivery_providers WHERE id = 'f783939a-f7f1-4c78-a9a3-295e55fa4956'
  )
ON CONFLICT (id) DO UPDATE
SET 
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

-- Step 4: Also ensure there's a provider record for current user (create new one if needed)
INSERT INTO delivery_providers (
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
  auth.uid(),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Delivery Provider', 'Unknown Provider'),
  'individual',
  COALESCE(u.raw_user_meta_data->>'phone', '+254000000000'),
  COALESCE(u.email, ''),
  true,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM delivery_providers WHERE user_id = auth.uid()
  );

-- Step 5: Update orders to use the provider ID that matches current user
UPDATE purchase_orders
SET 
  delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1),
  updated_at = NOW()
WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  AND EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid());

-- Step 6: Update delivery_requests to use the provider ID that matches current user
UPDATE delivery_requests
SET 
  provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1),
  updated_at = NOW()
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
)
AND EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid());

-- Step 7: Final Verification
SELECT 
  'After Fix' as section,
  auth.uid() as your_user_id,
  dp.id as your_provider_id,
  dp.user_id as provider_user_id,
  dp.provider_name,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as dr_provider_id,
  CASE
    WHEN po.delivery_provider_id = dp.id OR dr.provider_id = dp.id THEN '✅ MATCHES'
    ELSE '❌ DOES NOT MATCH'
  END as match_status
FROM delivery_providers dp
CROSS JOIN purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dp.user_id = auth.uid()
  AND po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
LIMIT 2;
