-- ============================================================
-- VERIFY DELIVERED ORDERS POLICY
-- ============================================================
-- This query checks if the RLS policy includes the Method 4
-- for delivered orders by examining the policy definition
-- ============================================================

-- Check the full policy definition
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,  -- This is the USING clause
    with_check
FROM pg_policies 
WHERE tablename = 'material_items'
AND policyname = 'Delivery providers can view assigned material items';

-- Also check if the policy includes references to 'delivered' or 'completed' status
-- This would indicate Method 4 is present
SELECT 
    policyname,
    CASE 
        WHEN qual::text LIKE '%delivered%' OR qual::text LIKE '%completed%' THEN '✅ Includes delivered orders logic'
        ELSE '❌ Missing delivered orders logic'
    END as has_delivered_logic,
    CASE 
        WHEN qual::text LIKE '%receive_scanned%' THEN '✅ Includes receive_scanned check'
        ELSE '❌ Missing receive_scanned check'
    END as has_receive_scanned_check
FROM pg_policies 
WHERE tablename = 'material_items'
AND policyname = 'Delivery providers can view assigned material items';
