-- ============================================================================
-- ENSURE ALL DELIVERY_REQUESTS COLUMNS EXIST
-- This script adds any missing columns to the delivery_requests table
-- ============================================================================

-- First, let's see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'delivery_requests'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS pickup_address TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS material_type TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS pickup_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS preferred_time TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS budget_range TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS required_vehicle_type TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS provider_id UUID;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS provider_response TEXT;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS builder_id UUID;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Show updated columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'delivery_requests'
ORDER BY ordinal_position;

