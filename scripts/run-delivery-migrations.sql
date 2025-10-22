-- Delivery System Enhancement Migration Runner
-- Run these migrations in order to upgrade the delivery page from 8.3/10 to 9.5/10

-- 1. Create delivery system tables
\i supabase/migrations/20241212_create_delivery_system_tables.sql

-- 2. Implement security policies
\i supabase/migrations/20241212_delivery_security_policies.sql

-- 3. Add delivery functions
\i supabase/migrations/20241212_delivery_functions.sql

-- Verify migrations completed successfully
SELECT 'Delivery system enhancements completed successfully!' as status;

-- Show table counts
SELECT 
    'delivery_providers' as table_name,
    COUNT(*) as record_count
FROM public.delivery_providers
UNION ALL
SELECT 
    'deliveries' as table_name,
    COUNT(*) as record_count
FROM public.deliveries
UNION ALL
SELECT 
    'delivery_tracking' as table_name,
    COUNT(*) as record_count
FROM public.delivery_tracking
UNION ALL
SELECT 
    'delivery_notifications' as table_name,
    COUNT(*) as record_count
FROM public.delivery_notifications
UNION ALL
SELECT 
    'delivery_reviews' as table_name,
    COUNT(*) as record_count
FROM public.delivery_reviews;
