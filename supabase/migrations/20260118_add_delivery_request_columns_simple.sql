-- ============================================================================
-- ADD REQUIRED COLUMNS TO DELIVERY_REQUESTS TABLE (SIMPLE VERSION)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add all required columns (IF NOT EXISTS prevents errors if they already exist)
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS builder_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2);
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS required_vehicle_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Now handle pickup_location if it exists and has NOT NULL constraint
DO $$
BEGIN
    -- Try to make pickup_location nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_requests' 
        AND column_name = 'pickup_location'
    ) THEN
        ALTER TABLE public.delivery_requests ALTER COLUMN pickup_location DROP NOT NULL;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS! All columns added.' AS result;

