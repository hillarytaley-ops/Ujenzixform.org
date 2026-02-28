-- ============================================================
-- TEST: Verify delivery provider acceptance triggers purchase_orders update
-- Run this after a delivery provider accepts a request
-- ============================================================

-- 1. Check the trigger function code to ensure it handles missing order_status_history
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_order_in_transit';

-- 2. Find a delivery request that was recently accepted/assigned
SELECT 
    dr.id as delivery_request_id,
    dr.purchase_order_id,
    dr.provider_id,
    dr.status,
    dr.updated_at,
    po.id as purchase_order_id,
    po.po_number,
    po.delivery_provider_id,
    po.delivery_provider_name,
    po.delivery_status,
    po.updated_at as po_updated_at,
    CASE 
        WHEN dr.purchase_order_id IS NULL THEN '❌ No purchase_order_id - trigger cannot update'
        WHEN po.delivery_provider_id IS NULL THEN '⚠️ purchase_order not updated yet'
        WHEN po.delivery_provider_id = dr.provider_id THEN '✅ WORKING - purchase_order updated!'
        ELSE '⚠️ Provider ID mismatch'
    END as status
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
ORDER BY dr.updated_at DESC
LIMIT 10;

-- 3. Check if trigger fired recently (check updated_at timestamps)
SELECT 
    dr.id as delivery_request_id,
    dr.updated_at as dr_updated_at,
    po.updated_at as po_updated_at,
    EXTRACT(EPOCH FROM (po.updated_at - dr.updated_at)) as seconds_difference,
    CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (po.updated_at - dr.updated_at))) < 5 THEN '✅ Trigger fired (updated within 5 seconds)'
        WHEN po.updated_at IS NULL THEN '❌ purchase_order never updated'
        ELSE '⚠️ Updated but timing suggests manual update, not trigger'
    END as trigger_status
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
  AND dr.purchase_order_id IS NOT NULL
ORDER BY dr.updated_at DESC
LIMIT 10;
