-- ============================================================
-- FIX: Provider ID Mismatch - Orders assigned to wrong provider
-- This will show what provider you are and fix the orders
-- ============================================================

-- Step 1: Check what provider ID the current user should have
SELECT 
  'Current User Info' as section,
  auth.uid() as current_user_id,
  dp.id as delivery_provider_id,
  dp.user_id,
  dp.provider_name,
  CASE
    WHEN dp.id IS NULL THEN '❌ NO DELIVERY PROVIDER RECORD FOUND'
    ELSE '✅ Found delivery provider'
  END as status
FROM delivery_providers dp
WHERE dp.user_id = auth.uid()
LIMIT 1;

-- Step 2: Check what provider the orders are assigned to
SELECT 
  'Order Assignment' as section,
  po.po_number,
  po.delivery_provider_id as order_provider_id,
  dr.provider_id as delivery_request_provider_id,
  dp_assigned.id as assigned_provider_id,
  dp_assigned.user_id as assigned_provider_user_id,
  dp_assigned.provider_name as assigned_provider_name
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
LEFT JOIN delivery_providers dp_assigned ON dp_assigned.id = COALESCE(po.delivery_provider_id, dr.provider_id)
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');

-- Step 3: FIX - Update orders to match current user's provider ID
-- This will assign the orders to the currently logged-in delivery provider
UPDATE purchase_orders po
SET 
  delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1),
  updated_at = NOW()
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
  AND EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid());

-- Step 4: Also update delivery_requests to match
UPDATE delivery_requests dr
SET 
  provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1),
  updated_at = NOW()
WHERE dr.purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
)
AND EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid());

-- Step 5: Verify the fix
SELECT 
  'Verification' as section,
  po.po_number,
  po.delivery_provider_id,
  dr.provider_id as dr_provider_id,
  (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1) as your_provider_id,
  CASE
    WHEN po.delivery_provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
      OR dr.provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1)
    THEN '✅ NOW MATCHES YOUR PROVIDER ID'
    ELSE '❌ STILL DOES NOT MATCH'
  END as match_status
FROM purchase_orders po
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS');
