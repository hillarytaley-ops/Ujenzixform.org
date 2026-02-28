-- ============================================================
-- Link delivery_requests to purchase_orders when purchase_order_id is null
-- This fixes delivery requests that weren't properly linked when created
-- ============================================================

-- Step 1: Try to link delivery_requests to purchase_orders based on matching criteria
UPDATE delivery_requests dr
SET purchase_order_id = po.id
FROM purchase_orders po
WHERE dr.purchase_order_id IS NULL
  AND dr.provider_id IS NOT NULL
  AND dr.status IN ('accepted', 'assigned')
  -- Match by builder_id and delivery address (if available)
  AND (
    (dr.builder_id = po.buyer_id AND dr.delivery_address = po.delivery_address)
    OR (dr.builder_id = po.buyer_id AND dr.delivery_address IS NOT NULL AND po.delivery_address IS NOT NULL 
        AND LOWER(TRIM(dr.delivery_address)) = LOWER(TRIM(po.delivery_address)))
    OR (dr.builder_id = po.buyer_id AND ABS(EXTRACT(EPOCH FROM (dr.created_at - po.created_at))) < 86400)
    -- Match by date proximity (within 24 hours) and same builder
  )
  -- Only link if purchase order doesn't already have a delivery provider
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id = dr.provider_id)
  -- Only link to orders that require delivery
  AND (po.delivery_required = true OR po.delivery_required IS NULL)
LIMIT 100; -- Limit to prevent too many updates at once

-- Step 2: Now update purchase_orders for delivery_requests that now have purchase_order_id
UPDATE purchase_orders po
SET 
    delivery_provider_id = dr.provider_id,
    delivery_provider_name = COALESCE(
        (SELECT full_name FROM profiles WHERE user_id = dr.provider_id LIMIT 1),
        (SELECT provider_name FROM delivery_providers WHERE id = dr.provider_id LIMIT 1),
        'Delivery Provider'
    ),
    delivery_provider_phone = COALESCE(
        (SELECT phone FROM profiles WHERE user_id = dr.provider_id LIMIT 1),
        (SELECT phone FROM delivery_providers WHERE id = dr.provider_id LIMIT 1),
        po.delivery_provider_phone
    ),
    delivery_status = CASE 
        WHEN dr.status = 'accepted' THEN 'accepted'
        WHEN dr.status = 'assigned' THEN 'accepted'
        ELSE 'accepted'
    END,
    delivery_assigned_at = COALESCE(po.delivery_assigned_at, dr.accepted_at, dr.updated_at, NOW()),
    delivery_accepted_at = CASE 
        WHEN dr.status = 'accepted' THEN COALESCE(po.delivery_accepted_at, dr.accepted_at, NOW())
        ELSE po.delivery_accepted_at
    END,
    updated_at = NOW()
FROM delivery_requests dr
WHERE dr.purchase_order_id = po.id
  AND dr.provider_id IS NOT NULL
  AND dr.status IN ('accepted', 'assigned')
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id);

-- Step 3: Show remaining delivery_requests that couldn't be linked
SELECT 
    dr.id as delivery_request_id,
    dr.builder_id,
    dr.purchase_order_id,
    dr.provider_id,
    dr.status as delivery_request_status,
    dr.delivery_address,
    dr.created_at as dr_created_at,
    'Could not find matching purchase_order' as issue
FROM delivery_requests dr
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
  AND dr.purchase_order_id IS NULL
LIMIT 20;
