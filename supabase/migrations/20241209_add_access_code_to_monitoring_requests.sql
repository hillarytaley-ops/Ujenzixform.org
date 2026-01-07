-- Add access_code column to monitoring_service_requests table
-- This column stores the unique access code generated when a request is approved

-- Add access_code column
ALTER TABLE monitoring_service_requests 
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Add live_stream_url column for storing the camera feed URL
ALTER TABLE monitoring_service_requests 
ADD COLUMN IF NOT EXISTS live_stream_url TEXT;

-- Add end_date column for monitoring period
ALTER TABLE monitoring_service_requests 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update the status check constraint to include 'active' status
-- First, drop the existing constraint if it exists
ALTER TABLE monitoring_service_requests 
DROP CONSTRAINT IF EXISTS monitoring_service_requests_status_check;

-- Add the new constraint with 'active' status
ALTER TABLE monitoring_service_requests 
ADD CONSTRAINT monitoring_service_requests_status_check 
CHECK (status IN ('pending', 'reviewing', 'quoted', 'approved', 'active', 'rejected', 'completed'));

-- Create index for access_code lookups
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_access_code 
ON monitoring_service_requests(access_code);

-- Create a function to generate unique access codes
CREATE OR REPLACE FUNCTION generate_monitoring_access_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code: MON-TIMESTAMP-RANDOM
        new_code := 'MON-' || 
                    UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' ||
                    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM monitoring_service_requests WHERE access_code = new_code
        ) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate access code when status changes to 'approved' or 'active'
CREATE OR REPLACE FUNCTION auto_generate_access_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if status is being changed to approved or active
    -- and access_code is not already set
    IF (NEW.status IN ('approved', 'active')) AND (NEW.access_code IS NULL OR NEW.access_code = '') THEN
        NEW.access_code := generate_monitoring_access_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_access_code ON monitoring_service_requests;
CREATE TRIGGER trigger_auto_generate_access_code
    BEFORE UPDATE ON monitoring_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_access_code();

-- Comment on the new columns
COMMENT ON COLUMN monitoring_service_requests.access_code IS 'Unique access code for builder to access monitoring cameras';
COMMENT ON COLUMN monitoring_service_requests.live_stream_url IS 'URL for the live camera stream';
COMMENT ON COLUMN monitoring_service_requests.end_date IS 'End date for the monitoring service';




