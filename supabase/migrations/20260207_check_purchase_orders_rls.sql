-- Check RLS policies on purchase_orders table
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

-- Check if RLS is enabled
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'purchase_orders';

-- Test insert permission for authenticated users
-- This should work if policies are correct
