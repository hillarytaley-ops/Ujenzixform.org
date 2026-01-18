-- ============================================================================
-- ADD MISSING COLUMNS TO DELIVERY_REQUESTS TABLE
-- This migration adds columns that the DeliveryRequest.tsx component needs
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add budget_range column if it doesn't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS budget_range TEXT;

-- Add required_vehicle_type column if it doesn't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS required_vehicle_type TEXT;

-- Add weight_kg column if it doesn't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2);

-- Add preferred_time column if it doesn't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS preferred_time TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'delivery_requests'
ORDER BY ordinal_position;

-- Refresh the schema cache (important for Supabase)
NOTIFY pgrst, 'reload schema';

SELECT 'Migration completed! delivery_requests table updated.' AS result;

