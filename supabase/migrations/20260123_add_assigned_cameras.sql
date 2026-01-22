-- Add assigned_cameras column to monitoring_service_requests table
-- This allows admins to assign specific cameras to each monitoring request

ALTER TABLE monitoring_service_requests
ADD COLUMN IF NOT EXISTS assigned_cameras UUID[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN monitoring_service_requests.assigned_cameras IS 'Array of camera IDs assigned to this monitoring request';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_assigned_cameras 
ON monitoring_service_requests USING GIN (assigned_cameras);

-- Update RLS policy to allow admins to update assigned_cameras
-- (The existing update policy should already cover this, but let's ensure it)

