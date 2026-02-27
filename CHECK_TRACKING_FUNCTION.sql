-- ============================================================
-- CHECK TRACKING FUNCTION: Show the actual source code
-- ============================================================

-- Show the actual source code of create_tracking_on_delivery_accept
SELECT 
    p.proname as function_name,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_tracking_on_delivery_accept';

-- Also check if there are any other functions that might be called
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.prosrc LIKE '%NEW.delivery_provider_phone%' THEN 'PROBLEM: Sets NEW.delivery_provider_phone'
        WHEN p.prosrc LIKE '%delivery_provider_phone%NEW%' THEN 'PROBLEM: References delivery_provider_phone with NEW'
        WHEN p.prosrc LIKE '%delivery_provider_phone%' AND p.prosrc LIKE '%delivery_requests%' THEN 'PROBLEM: References delivery_provider_phone in delivery_requests context'
        ELSE 'OK'
    END as status,
    substring(p.prosrc, 1, 500) as source_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%delivery_provider_phone%';
