-- ============================================================================
-- IMMEDIATE CLEANUP: Remove duplicate delivery requests for same purchase_order
-- Run this to fix existing duplicates in the database
-- ============================================================================

-- This script will:
-- 1. Find all purchase_orders with multiple active delivery_requests
-- 2. Keep only the most recent/active one
-- 3. Cancel all duplicates

DO $$
DECLARE
    duplicate_record RECORD;
    kept_id UUID;
    cancelled_count INTEGER := 0;
    total_duplicates INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cleanup of duplicate delivery requests...';
    
    -- Find all purchase_order_ids with multiple active delivery_requests
    FOR duplicate_record IN
        SELECT 
            purchase_order_id, 
            COUNT(*) as count,
            array_agg(id ORDER BY 
                CASE status
                    WHEN 'accepted' THEN 5
                    WHEN 'assigned' THEN 4
                    WHEN 'in_transit' THEN 3
                    WHEN 'picked_up' THEN 2
                    WHEN 'out_for_delivery' THEN 2
                    WHEN 'scheduled' THEN 1
                    WHEN 'pending' THEN 1
                    ELSE 0
                END DESC,
                created_at DESC
            ) as request_ids
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    LOOP
        total_duplicates := total_duplicates + (duplicate_record.count - 1);
        
        -- Get the ID to keep (first in the sorted array)
        kept_id := duplicate_record.request_ids[1];
        
        -- Cancel all other active delivery_requests for this purchase_order_id
        UPDATE delivery_requests
        SET 
            status = 'cancelled',
            rejection_reason = 'Duplicate delivery request - cleaned up by migration. Kept request: ' || kept_id::text,
            updated_at = NOW()
        WHERE purchase_order_id = duplicate_record.purchase_order_id
          AND id != kept_id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');
        
        cancelled_count := cancelled_count + (duplicate_record.count - 1);
        
        RAISE NOTICE 'Cleaned up % duplicate(s) for purchase_order_id %, kept: %', 
            duplicate_record.count - 1, 
            duplicate_record.purchase_order_id, 
            kept_id;
    END LOOP;
    
    RAISE NOTICE 'Cleanup complete! Cancelled % duplicate delivery requests across % purchase orders.', 
        cancelled_count, 
        (SELECT COUNT(DISTINCT purchase_order_id) FROM delivery_requests WHERE purchase_order_id IS NOT NULL AND status = 'cancelled' AND rejection_reason LIKE '%Duplicate delivery request%');
END $$;

-- Verify cleanup: Show any remaining duplicates
SELECT 
    purchase_order_id,
    COUNT(*) as remaining_count,
    array_agg(id) as request_ids,
    array_agg(status) as statuses
FROM delivery_requests
WHERE purchase_order_id IS NOT NULL
  AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled')
GROUP BY purchase_order_id
HAVING COUNT(*) > 1;

-- If the above query returns rows, there are still duplicates that need manual attention
-- Otherwise, cleanup was successful!

SELECT 'Duplicate delivery request cleanup completed! Check the verification query above for any remaining duplicates.' AS result;
