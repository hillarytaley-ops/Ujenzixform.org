-- ============================================================
-- DIAGNOSE: Why delivery providers can't see purchase_orders
-- ============================================================

-- 1. Check what statuses actually exist in purchase_orders
SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as most_recent
FROM purchase_orders
GROUP BY status
ORDER BY count DESC;

-- 2. Check orders that should be visible to delivery providers
SELECT 
    id,
    status,
    quote_accepted_at,
    order_created_at,
    delivery_requested_at,
    created_at,
    supplier_id,
    builder_id
FROM purchase_orders
WHERE status IN (
    'quote_accepted',
    'order_created', 
    'awaiting_delivery_request',
    'delivery_requested',
    'awaiting_delivery_provider',
    'delivery_assigned',
    'ready_for_dispatch'
)
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if delivery_provider_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name LIKE '%delivery%'
ORDER BY column_name;

-- 4. Check RLS policies on purchase_orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'purchase_orders';

-- 5. Check if user is a delivery provider (replace with actual user_id)
-- SELECT 
--     dp.id,
--     dp.user_id,
--     p.full_name
-- FROM delivery_providers dp
-- JOIN profiles p ON p.user_id = dp.user_id
-- WHERE dp.user_id = 'YOUR_USER_ID_HERE';
