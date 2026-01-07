-- ============================================================================
-- REFRESH SCHEMA CACHE
-- Run this to notify PostgREST to reload the schema
-- ============================================================================

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verify delivery_requests table structure
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if delivery_address column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_requests' 
        AND column_name = 'delivery_address'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'delivery_address column does NOT exist - creating it';
        ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_address TEXT;
    ELSE
        RAISE NOTICE 'delivery_address column exists';
    END IF;
    
    -- Check if pickup_address column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_requests' 
        AND column_name = 'pickup_address'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'pickup_address column does NOT exist - creating it';
        ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_address TEXT;
    ELSE
        RAISE NOTICE 'pickup_address column exists';
    END IF;
END $$;

-- Show all columns in delivery_requests table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'delivery_requests'
ORDER BY ordinal_position;

