-- ============================================================
-- Real-Time Tracking Updates
-- Enables real-time location updates for tracking_numbers table
-- Created: February 16, 2026
-- ============================================================

-- Enable real-time for tracking_numbers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_numbers;

-- Enable real-time for tracking_history table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_history;

-- Function to update tracking status based on location changes
CREATE OR REPLACE FUNCTION update_tracking_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If delivery is picked up (provider has materials)
    IF NEW.picked_up_at IS NOT NULL AND OLD.picked_up_at IS NULL THEN
        NEW.status := 'picked_up';
    END IF;
    
    -- If location is being updated and status was 'accepted', change to 'in_transit'
    IF NEW.current_latitude IS NOT NULL AND NEW.current_longitude IS NOT NULL 
       AND NEW.status = 'accepted' AND NEW.picked_up_at IS NOT NULL THEN
        NEW.status := 'in_transit';
    END IF;
    
    -- If delivered
    IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
        NEW.status := 'delivered';
        NEW.actual_delivery_date := CURRENT_DATE;
    END IF;
    
    -- Always update the updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY INVOKER;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS trigger_update_tracking_status ON public.tracking_numbers;
CREATE TRIGGER trigger_update_tracking_status
    BEFORE UPDATE ON public.tracking_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_tracking_status();

-- Function to notify on tracking updates (for real-time subscriptions)
CREATE OR REPLACE FUNCTION notify_tracking_update()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload := jsonb_build_object(
        'tracking_number', NEW.tracking_number,
        'delivery_request_id', NEW.delivery_request_id,
        'status', NEW.status,
        'current_latitude', NEW.current_latitude,
        'current_longitude', NEW.current_longitude,
        'last_location_update', NEW.last_location_update,
        'provider_name', NEW.provider_name,
        'updated_at', NEW.updated_at
    );
    
    -- Broadcast to a channel that clients can subscribe to
    PERFORM pg_notify('tracking_updates', payload::text);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY INVOKER;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS trigger_notify_tracking_update ON public.tracking_numbers;
CREATE TRIGGER trigger_notify_tracking_update
    AFTER UPDATE ON public.tracking_numbers
    FOR EACH ROW
    WHEN (OLD.current_latitude IS DISTINCT FROM NEW.current_latitude 
          OR OLD.current_longitude IS DISTINCT FROM NEW.current_longitude
          OR OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_tracking_update();

-- Add index for faster real-time queries
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_realtime 
    ON public.tracking_numbers(delivery_request_id, status, last_location_update DESC);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.tracking_numbers TO authenticated;
GRANT SELECT, INSERT ON public.tracking_history TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
