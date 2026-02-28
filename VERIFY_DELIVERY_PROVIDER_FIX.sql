-- ============================================================
-- VERIFY: Check if delivery provider communication is working
-- Run this to see the current status
-- ============================================================

-- 1. Check delivery_requests that have providers but no purchase_order_id
SELECT 
    COUNT(*) as unlinked_delivery_requests,
    'Delivery requests with providers but no purchase_order_id' as description
FROM delivery_requests dr
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
  AND dr.purchase_order_id IS NULL;

-- 2. Check delivery_requests that ARE linked to purchase_orders
SELECT 
    COUNT(*) as linked_delivery_requests,
    'Delivery requests linked to purchase_orders' as description
FROM delivery_requests dr
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
  AND dr.purchase_order_id IS NOT NULL;

-- 3. Check purchase_orders that have delivery providers assigned
SELECT 
    COUNT(*) as orders_with_providers,
    'Purchase orders with delivery providers' as description
FROM purchase_orders po
WHERE po.delivery_provider_id IS NOT NULL;

-- 4. Check purchase_orders that need delivery but don't have providers
SELECT 
    COUNT(*) as orders_awaiting_providers,
    'Purchase orders awaiting delivery providers' as description
FROM purchase_orders po
WHERE (po.delivery_required = true OR po.delivery_required IS NULL)
  AND po.delivery_provider_id IS NULL
  AND po.status NOT IN ('cancelled', 'rejected');

-- 5. Detailed view: Show delivery_requests and their linked purchase_orders
SELECT 
    dr.id as delivery_request_id,
    dr.status as dr_status,
    dr.provider_id as dr_provider_id,
    dr.purchase_order_id,
    po.id as po_id,
    po.po_number,
    po.delivery_provider_id as po_provider_id,
    po.delivery_provider_name,
    po.delivery_status,
    CASE 
        WHEN dr.purchase_order_id IS NULL THEN '❌ NOT LINKED'
        WHEN po.delivery_provider_id IS NULL THEN '⚠️ LINKED BUT NOT UPDATED'
        WHEN po.delivery_provider_id = dr.provider_id THEN '✅ WORKING'
        ELSE '⚠️ MISMATCH'
    END as status_check
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
ORDER BY dr.created_at DESC
LIMIT 20;

-- 6. Check if trigger function exists and is correct
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_order_in_transit';
