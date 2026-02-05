-- ============================================================
-- Add delivery_coordinates column to delivery_requests
-- For storing GPS coordinates separately
-- Created: February 5, 2026
-- ============================================================

-- Add delivery_coordinates column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_requests' 
        AND column_name = 'delivery_coordinates'
    ) THEN
        ALTER TABLE delivery_requests 
        ADD COLUMN delivery_coordinates TEXT;
        
        COMMENT ON COLUMN delivery_requests.delivery_coordinates IS 'GPS coordinates in format: latitude, longitude (e.g., -1.286389, 36.817223)';
    END IF;
END $$;

-- Add pickup_coordinates column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_requests' 
        AND column_name = 'pickup_coordinates'
    ) THEN
        ALTER TABLE delivery_requests 
        ADD COLUMN pickup_coordinates TEXT;
        
        COMMENT ON COLUMN delivery_requests.pickup_coordinates IS 'GPS coordinates for pickup location';
    END IF;
END $$;

-- Create index for coordinate-based queries (for finding nearby deliveries)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_coordinates 
ON delivery_requests(delivery_coordinates) 
WHERE delivery_coordinates IS NOT NULL;

-- ============================================================
-- Migration Complete
-- ============================================================
