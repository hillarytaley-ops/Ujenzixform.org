-- ============================================================
-- CHECK: Why delivery providers can't see orders
-- ============================================================

-- 1. First, check what statuses your orders actually have
SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as most_recent
FROM purchase_orders
WHERE created_at > NOW() - INTERVAL '7 days'  -- Last 7 days
GROUP BY status
ORDER BY count DESC;

-- 2. Check if you're actually a delivery provider
-- Replace 'YOUR_USER_ID' with your actual user_id from auth.users
SELECT 
    dp.id as provider_id,
    dp.user_id,
    p.full_name,
    p.email
FROM delivery_providers dp
LEFT JOIN profiles p ON p.user_id = dp.user_id
WHERE dp.user_id = auth.uid()  -- This will use the current logged-in user
LIMIT 1;

-- 3. Check orders that SHOULD be visible (with delivery-related statuses)
SELECT 
    id,
    status,
    buyer_id,
    builder_id,
    supplier_id,
    quote_accepted_at,
    order_created_at,
    delivery_requested_at,
    created_at
FROM purchase_orders
WHERE status IN (
    'quote_accepted',
    'order_created', 
    'awaiting_delivery_request',
    'delivery_requested',
    'awaiting_delivery_provider',
    'delivery_assigned',
    'ready_for_dispatch',
    'pending',
    'quoted',
    'confirmed',
    'accepted'
)
AND created_at > NOW() - INTERVAL '7 days'  -- Last 7 days
ORDER BY created_at DESC
LIMIT 20;

-- 4. Test the RLS policy directly (this simulates what a delivery provider would see)
-- This will only work if you're logged in as a delivery provider
SELECT COUNT(*) as visible_orders_count
FROM purchase_orders
WHERE status IN (
    'quote_accepted',
    'order_created', 
    'awaiting_delivery_request',
    'delivery_requested',
    'awaiting_delivery_provider',
    'delivery_assigned',
    'ready_for_dispatch'
);

-- 5. Check if there are any orders with NULL or unexpected statuses
SELECT 
    COUNT(*) as null_status_count
FROM purchase_orders
WHERE status IS NULL OR status = '';
