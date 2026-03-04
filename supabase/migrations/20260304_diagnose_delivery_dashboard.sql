-- ============================================================
-- Diagnostic Query for Delivery Dashboard
-- Run this in Supabase SQL Editor to check delivery data
-- ============================================================

-- 1. Check all delivery_requests and their statuses
SELECT 
    id,
    status,
    provider_id,
    purchase_order_id,
    material_type,
    delivery_address,
    created_at,
    updated_at
FROM delivery_requests
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check all purchase_orders with delivery providers
SELECT 
    id,
    po_number,
    status,
    delivery_provider_id,
    delivery_status,
    delivery_address,
    created_at,
    updated_at
FROM purchase_orders
WHERE delivery_provider_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 3. Count deliveries by status for delivery_requests
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN provider_id IS NOT NULL THEN 1 END) as with_provider,
    COUNT(CASE WHEN provider_id IS NULL THEN 1 END) as without_provider
FROM delivery_requests
GROUP BY status
ORDER BY count DESC;

-- 4. Count purchase_orders by status with delivery providers
SELECT 
    status,
    COUNT(*) as total_count,
    COUNT(CASE WHEN delivery_provider_id IS NOT NULL THEN 1 END) as with_provider
FROM purchase_orders
WHERE delivery_provider_id IS NOT NULL
GROUP BY status
ORDER BY total_count DESC;

-- 5. Check specific provider's deliveries (replace USER_ID_HERE with actual user ID)
-- First, get your user ID from auth.users or check the console logs
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then check deliveries for that provider:
-- SELECT 
--     id,
--     status,
--     provider_id,
--     material_type,
--     delivery_address,
--     created_at
-- FROM delivery_requests
-- WHERE provider_id = 'USER_ID_HERE'
-- ORDER BY created_at DESC;

-- 6. Check purchase_orders for specific provider (replace USER_ID_HERE)
-- SELECT 
--     id,
--     po_number,
--     status,
--     delivery_provider_id,
--     delivery_status,
--     delivery_address,
--     created_at
-- FROM purchase_orders
-- WHERE delivery_provider_id = 'USER_ID_HERE'
-- ORDER BY created_at DESC;
