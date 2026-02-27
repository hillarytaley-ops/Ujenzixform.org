-- ============================================================
-- FIND THE PROBLEM: Show actual function source code
-- This will help us see what's actually in the database
-- ============================================================

-- Show the actual source code of create_tracking_on_delivery_accept
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as full_definition,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_tracking_on_delivery_accept';

-- Show the actual source code of update_purchase_order_on_delivery_accept
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as full_definition,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'update_purchase_order_on_delivery_accept';

-- Check if there's a view on delivery_requests
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (view_definition LIKE '%delivery_requests%' AND view_definition LIKE '%delivery_provider_phone%');

-- Check for computed columns or generated columns
SELECT 
    column_name,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'delivery_requests'
AND (column_default LIKE '%delivery_provider_phone%' OR generation_expression LIKE '%delivery_provider_phone%');

-- Check RLS policies that might reference delivery_provider_phone
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
WHERE tablename = 'delivery_requests'
AND (qual::text LIKE '%delivery_provider_phone%' OR with_check::text LIKE '%delivery_provider_phone%');
