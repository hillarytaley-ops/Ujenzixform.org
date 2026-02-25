-- ============================================================
-- Add GPS Coordinates to Builder Projects
-- For accurate delivery location of materials
-- Created: February 25, 2026
-- ============================================================

-- Add GPS coordinate columns to builder_projects if not exists
DO $$ 
BEGIN
    -- Latitude
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'latitude') THEN
        ALTER TABLE builder_projects ADD COLUMN latitude DECIMAL(10,8);
    END IF;
    
    -- Longitude
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'longitude') THEN
        ALTER TABLE builder_projects ADD COLUMN longitude DECIMAL(11,8);
    END IF;
    
    -- Detailed address (from reverse geocoding)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'address') THEN
        ALTER TABLE builder_projects ADD COLUMN address TEXT;
    END IF;
END $$;

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_builder_projects_location ON builder_projects(latitude, longitude);

-- ============================================================
-- Migration Complete
-- ============================================================
