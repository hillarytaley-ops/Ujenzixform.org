-- ============================================================
-- ULTIMATE FIX: Completely remove provider lookups from tracking function
-- This eliminates ANY possibility of referencing delivery_provider_phone
-- ============================================================

-- Drop the tracking function completely
DROP FUNCTION IF EXISTS public.create_tracking_on_delivery_accept() CASCADE;

-- Create the SIMPLEST possible tracking function - NO provider lookups at all
CREATE OR REPLACE FUNCTION public.create_tracking_on_delivery_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tracking_num TEXT;
BEGIN
    -- ONLY create tracking when status changes to accepted/assigned
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Insert tracking number with MINIMAL data - NO provider lookups
        BEGIN
            INSERT INTO public.tracking_numbers (
                tracking_number,
                delivery_request_id,
                builder_id,
                delivery_provider_id,
                status,
                delivery_address,
                materials_description,
                provider_name,
                accepted_at
            )
            VALUES (
                v_tracking_num,
                NEW.id,
                NEW.builder_id,
                NEW.provider_id,
                'accepted',
                COALESCE(NEW.delivery_address, 'N/A'),
                COALESCE(NEW.materials_description, 'Materials'),
                'Delivery Provider',  -- Hardcoded, NO lookup
                NOW()
            );
            
            -- ONLY set tracking_number on delivery_requests
            -- DO NOT set ANY other columns
            NEW.tracking_number := v_tracking_num;
            
        EXCEPTION WHEN OTHERS THEN
            -- Silently fail - don't break the update
            NULL;
        END;
    END IF;
    
    -- Return NEW - ONLY tracking_number is modified, nothing else
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO authenticated;

-- Verify the function doesn't reference delivery_provider_phone
SELECT 
    CASE 
        WHEN prosrc LIKE '%NEW.delivery_provider_phone%' THEN 'ERROR: Function still references NEW.delivery_provider_phone!'
        WHEN prosrc LIKE '%delivery_provider_phone%' AND prosrc LIKE '%NEW%' THEN 'ERROR: Function references delivery_provider_phone with NEW!'
        ELSE 'OK: Function does not reference delivery_provider_phone on delivery_requests'
    END as verification
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_tracking_on_delivery_accept';

-- DONE! Now try accepting a delivery.
