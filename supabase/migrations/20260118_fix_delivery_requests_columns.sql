-- ============================================================================
-- FIX DELIVERY_REQUESTS TABLE COLUMN NAMES
-- The code uses pickup_address/delivery_address but DB has pickup_location/delivery_location
-- This migration adds the correct columns and makes old columns nullable
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, make the old columns nullable (if they exist)
ALTER TABLE public.delivery_requests 
ALTER COLUMN pickup_location DROP NOT NULL;

ALTER TABLE public.delivery_requests 
ALTER COLUMN delivery_location DROP NOT NULL;

-- Add the new columns that the code expects (if they don't exist)
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS pickup_address TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Copy data from old columns to new columns (if old columns have data)
UPDATE public.delivery_requests 
SET pickup_address = pickup_location 
WHERE pickup_address IS NULL AND pickup_location IS NOT NULL;

UPDATE public.delivery_requests 
SET delivery_address = delivery_location 
WHERE delivery_address IS NULL AND delivery_location IS NOT NULL;

-- Add all other required columns
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS builder_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS purchase_order_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2);
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS required_vehicle_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS provider_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Column names fixed! pickup_address and delivery_address now available.' AS result;

