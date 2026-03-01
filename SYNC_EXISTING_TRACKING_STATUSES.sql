-- ============================================================
-- One-Time Sync: Update existing tracking_numbers.status from delivery_requests.status
-- Run this ONCE to fix existing tracking numbers that are out of sync
-- Created: March 1, 2026
-- ============================================================

-- Update tracking_numbers.status based on delivery_requests.status
UPDATE tracking_numbers tn
SET 
    status = CASE dr.status
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
    END,
    picked_up_at = CASE 
        WHEN dr.status = 'picked_up' AND tn.picked_up_at IS NULL 
        THEN dr.picked_up_at
        ELSE tn.picked_up_at
    END,
    delivered_at = CASE 
        WHEN dr.status IN ('delivered', 'completed') AND tn.delivered_at IS NULL
        THEN dr.delivered_at
        ELSE tn.delivered_at
    END,
    updated_at = NOW()
FROM delivery_requests dr
WHERE tn.delivery_request_id = dr.id
  AND (
    -- Only update if status is different
    CASE dr.status
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
    END != tn.status
    OR (dr.picked_up_at IS NOT NULL AND tn.picked_up_at IS NULL)
    OR (dr.delivered_at IS NOT NULL AND tn.delivered_at IS NULL)
  );

-- Show summary of updates
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Synced % tracking_numbers records with delivery_requests status', updated_count;
END $$;

-- ============================================================
-- Verification Query - Run this to check sync status
-- ============================================================
-- SELECT 
--     tn.tracking_number,
--     tn.status as tracking_status,
--     dr.status as delivery_request_status,
--     CASE 
--         WHEN CASE dr.status
--             WHEN 'pending' THEN 'pending'
--             WHEN 'accepted' THEN 'accepted'
--             WHEN 'assigned' THEN 'accepted'
--             WHEN 'picked_up' THEN 'picked_up'
--             WHEN 'in_transit' THEN 'in_transit'
--             WHEN 'near_destination' THEN 'near_destination'
--             WHEN 'delivered' THEN 'delivered'
--             WHEN 'completed' THEN 'delivered'
--             WHEN 'cancelled' THEN 'cancelled'
--             WHEN 'rejected' THEN 'cancelled'
--             ELSE tn.status
--         END = tn.status THEN '✅ SYNCED'
--         ELSE '❌ OUT OF SYNC'
--     END as sync_status
-- FROM tracking_numbers tn
-- JOIN delivery_requests dr ON tn.delivery_request_id = dr.id
-- ORDER BY tn.created_at DESC
-- LIMIT 50;
