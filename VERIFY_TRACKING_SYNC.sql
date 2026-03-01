-- ============================================================
-- Verify Tracking Status Sync Setup
-- Run this to check if the sync trigger is working
-- ============================================================

-- 1. Check if the trigger function exists
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'sync_delivery_status_to_tracking';

-- 2. Check if the trigger exists
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND t.tgname = 'trigger_sync_delivery_status_to_tracking';

-- 3. Check for status mismatches between delivery_requests and tracking_numbers
SELECT 
    tn.tracking_number,
    tn.status as tracking_status,
    dr.status as delivery_request_status,
    dr.id as delivery_request_id,
    CASE 
        WHEN CASE dr.status
            WHEN 'pending' THEN 'pending'
            WHEN 'accepted' THEN 'accepted'
            WHEN 'assigned' THEN 'accepted'
            WHEN 'picked_up' THEN 'picked_up'
            WHEN 'in_transit' THEN 'in_transit'
            WHEN 'near_destination' THEN 'near_destination'
            WHEN 'delivered' THEN 'delivered'
            WHEN 'completed' THEN 'delivered'
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'rejected' THEN 'cancelled'
            ELSE tn.status
        END = tn.status THEN '✅ SYNCED'
        ELSE '❌ OUT OF SYNC'
    END as sync_status
FROM tracking_numbers tn
JOIN delivery_requests dr ON tn.delivery_request_id = dr.id
ORDER BY tn.created_at DESC
LIMIT 50;

-- 4. Count how many are out of sync
SELECT 
    COUNT(*) as total_tracking_numbers,
    COUNT(CASE 
        WHEN CASE dr.status
            WHEN 'pending' THEN 'pending'
            WHEN 'accepted' THEN 'accepted'
            WHEN 'assigned' THEN 'accepted'
            WHEN 'picked_up' THEN 'picked_up'
            WHEN 'in_transit' THEN 'in_transit'
            WHEN 'near_destination' THEN 'near_destination'
            WHEN 'delivered' THEN 'delivered'
            WHEN 'completed' THEN 'delivered'
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'rejected' THEN 'cancelled'
            ELSE tn.status
        END != tn.status THEN 1 END) as out_of_sync_count
FROM tracking_numbers tn
JOIN delivery_requests dr ON tn.delivery_request_id = dr.id;
