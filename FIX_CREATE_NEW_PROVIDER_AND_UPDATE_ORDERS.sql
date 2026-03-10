-- ============================================================
-- FIX: Create New Provider Record and Update Orders
-- This creates a fresh provider record for you and updates orders
-- ============================================================

-- Step 1: Show current situation
SELECT 
  'Current Situation' as section,
  auth.uid() as your_user_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as your_existing_provider_id,
  (SELECT COUNT(*) FROM delivery_providers WHERE user_id = auth.uid()) as your_provider_count;

-- Step 2: Create a new provider record for current user (if doesn't exist)
-- This will use a new UUID, not the one from orders
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
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'company_name'), ''),
    'Delivery Provider'
  ),
  'individual',
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
    '+254000000000'
  ),
  COALESCE(u.email, ''),
  true,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM delivery_providers WHERE user_id = auth.uid()
  )
RETURNING id as new_provider_id;

-- Step 3: Get the provider ID (either newly created or existing)
DO $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Get provider ID for current user
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- If we have a provider ID, update the orders
  IF v_provider_id IS NOT NULL THEN
    -- Update purchase_orders
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

    RAISE NOTICE '✅ Updated orders to use provider ID: %', v_provider_id;
  ELSE
    RAISE NOTICE '❌ Could not create or find provider ID for user';
  END IF;
END $$;

-- Step 4: Final Verification
SELECT 
  'Final Verification' as section,
  auth.uid() as your_user_id,
  dp.id as your_provider_id,
  dp.provider_name,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as dr_provider_id,
  CASE
    WHEN po.delivery_provider_id = dp.id THEN '✅ ORDER MATCHES'
    WHEN dr.provider_id = dp.id THEN '✅ DELIVERY REQUEST MATCHES'
    ELSE '❌ DOES NOT MATCH'
  END as match_status
FROM delivery_providers dp
CROSS JOIN purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dp.user_id = auth.uid()
  AND po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
