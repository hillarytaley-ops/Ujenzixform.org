-- ============================================================
-- Sync delivery_requests.status to tracking_numbers.status
-- When providers update delivery_requests status, sync to tracking_numbers
-- Created: March 1, 2026
-- ============================================================

-- Function to sync delivery_requests status to tracking_numbers
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

-- Create trigger on delivery_requests to sync status to tracking_numbers
DROP TRIGGER IF EXISTS trigger_sync_delivery_status_to_tracking ON delivery_requests;
CREATE TRIGGER trigger_sync_delivery_status_to_tracking
    AFTER UPDATE OF status ON delivery_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_delivery_status_to_tracking();

-- Also sync when picked_up_at or delivered_at changes
DROP TRIGGER IF EXISTS trigger_sync_delivery_timestamps_to_tracking ON delivery_requests;
CREATE TRIGGER trigger_sync_delivery_timestamps_to_tracking
    AFTER UPDATE OF picked_up_at, delivered_at ON delivery_requests
    FOR EACH ROW
    WHEN (
        (OLD.picked_up_at IS DISTINCT FROM NEW.picked_up_at) OR
        (OLD.delivered_at IS DISTINCT FROM NEW.delivered_at)
    )
    EXECUTE FUNCTION sync_delivery_status_to_tracking();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_delivery_status_to_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_delivery_status_to_tracking() TO anon;

-- ============================================================
-- Migration Complete
-- ============================================================
