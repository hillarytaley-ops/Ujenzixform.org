-- ============================================================
-- COMPLETE FIX: Tracking Status Updates Not Showing
-- This script will:
-- 1. Verify the sync trigger exists
-- 2. Create it if missing
-- 3. Sync all existing tracking numbers
-- 4. Verify the sync worked
-- Created: March 1, 2026
-- ============================================================

-- STEP 1: Ensure the sync function exists
CREATE OR REPLACE FUNCTION sync_delivery_status_to_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tracking_status TEXT;
    v_tracking_id UUID;
BEGIN
    -- Only sync if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.tracking_number IS NOT NULL THEN
        
        -- Map delivery_requests status to tracking_numbers status
        v_tracking_status := CASE NEW.status
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
            ELSE 'pending'
        END;
        
        -- Find the tracking_number record by delivery_request_id
        SELECT id INTO v_tracking_id
        FROM tracking_numbers
        WHERE delivery_request_id = NEW.id
        LIMIT 1;
        
        -- If tracking number exists, update its status
        IF v_tracking_id IS NOT NULL THEN
            UPDATE tracking_numbers
            SET 
                status = v_tracking_status,
                updated_at = NOW(),
                -- Also sync timestamp fields
                picked_up_at = CASE 
                    WHEN NEW.status = 'picked_up' AND OLD.status != 'picked_up' 
                    THEN COALESCE(NEW.picked_up_at, NOW())
                    ELSE picked_up_at
                END,
                delivered_at = CASE 
                    WHEN NEW.status IN ('delivered', 'completed') AND OLD.status NOT IN ('delivered', 'completed')
                    THEN COALESCE(NEW.delivered_at, NOW())
                    ELSE delivered_at
                END
            WHERE id = v_tracking_id;
            
            RAISE NOTICE 'Synced delivery_requests status % to tracking_numbers status % for delivery_request_id %', 
                NEW.status, v_tracking_status, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- STEP 2: Create/Recreate the triggers
DROP TRIGGER IF EXISTS trigger_sync_delivery_status_to_tracking ON delivery_requests;
CREATE TRIGGER trigger_sync_delivery_status_to_tracking
    AFTER UPDATE OF status ON delivery_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_delivery_status_to_tracking();

DROP TRIGGER IF EXISTS trigger_sync_delivery_timestamps_to_tracking ON delivery_requests;
CREATE TRIGGER trigger_sync_delivery_timestamps_to_tracking
    AFTER UPDATE OF picked_up_at, delivered_at ON delivery_requests
    FOR EACH ROW
    WHEN (
        (OLD.picked_up_at IS DISTINCT FROM NEW.picked_up_at) OR
        (OLD.delivered_at IS DISTINCT FROM NEW.delivered_at)
    )
    EXECUTE FUNCTION sync_delivery_status_to_tracking();

-- STEP 3: Sync ALL existing tracking numbers (one-time fix)
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

-- STEP 4: Show summary
DO $$
DECLARE
    updated_count INTEGER;
    total_tracking INTEGER;
    synced_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    SELECT COUNT(*) INTO total_tracking FROM tracking_numbers;
    
    SELECT COUNT(*) INTO synced_count
    FROM tracking_numbers tn
    JOIN delivery_requests dr ON tn.delivery_request_id = dr.id
    WHERE CASE dr.status
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
    END = tn.status;
    
    RAISE NOTICE '✅ Updated % tracking_numbers records', updated_count;
    RAISE NOTICE '📊 Total tracking numbers: %', total_tracking;
    RAISE NOTICE '✅ Currently synced: %', synced_count;
    RAISE NOTICE '❌ Out of sync: %', total_tracking - synced_count;
END $$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION sync_delivery_status_to_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_delivery_status_to_tracking() TO anon;

-- ============================================================
-- VERIFICATION: Check sync status
-- ============================================================
SELECT 
    'VERIFICATION' as check_type,
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
        END = tn.status THEN 1 END) as synced_count,
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

-- ============================================================
-- COMPLETE!
-- ============================================================
