-- ============================================================
-- FIX: Tracking Numbers Trigger
-- Run this AFTER the main tracking_numbers migration
-- ============================================================

-- 1. Make builder_id nullable (it can be profile.id or user.id)
ALTER TABLE public.tracking_numbers 
ALTER COLUMN builder_id DROP NOT NULL;

-- Drop foreign key constraints if they exist
ALTER TABLE public.tracking_numbers 
DROP CONSTRAINT IF EXISTS tracking_numbers_builder_id_fkey;

ALTER TABLE public.tracking_numbers 
DROP CONSTRAINT IF EXISTS tracking_numbers_delivery_provider_id_fkey;

-- 2. Drop and recreate the trigger function
DROP FUNCTION IF EXISTS create_tracking_on_delivery_accept() CASCADE;

CREATE OR REPLACE FUNCTION create_tracking_on_delivery_accept()
RETURNS TRIGGER AS $$
DECLARE
    v_builder_user_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
    v_delivery_address TEXT;
    v_tracking_num TEXT;
BEGIN
    -- When a delivery request is accepted (status changes to 'accepted' or 'assigned')
    IF (NEW.status IN ('accepted', 'assigned') AND (OLD.status = 'pending' OR OLD.status IS NULL OR OLD.provider_id IS NULL)) THEN
        
        -- Generate tracking number first
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Try to get builder's user_id from profiles table
        BEGIN
            SELECT user_id INTO v_builder_user_id
            FROM profiles
            WHERE id = NEW.builder_id;
        EXCEPTION WHEN OTHERS THEN
            v_builder_user_id := NEW.builder_id;
        END;
        
        -- If still null, use builder_id directly
        IF v_builder_user_id IS NULL THEN
            v_builder_user_id := NEW.builder_id;
        END IF;
        
        -- Get provider info
        BEGIN
            SELECT full_name, phone INTO v_provider_name, v_provider_phone
            FROM profiles
            WHERE user_id = NEW.provider_id OR id = NEW.provider_id
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_provider_name := 'Delivery Provider';
            v_provider_phone := NULL;
        END;
        
        -- Get delivery address (try multiple column names)
        v_delivery_address := COALESCE(
            NEW.delivery_address,
            NEW.dropoff_address,
            NEW.dropoff_location,
            'Address not specified'
        );
        
        -- Insert tracking number
        BEGIN
            INSERT INTO public.tracking_numbers (
                tracking_number,
                delivery_request_id,
                builder_id,
                delivery_provider_id,
                status,
                delivery_address,
                materials_description,
                estimated_delivery_date,
                provider_name,
                provider_phone,
                accepted_at
            )
            VALUES (
                v_tracking_num,
                NEW.id,
                v_builder_user_id,
                NEW.provider_id,
                'accepted',
                v_delivery_address,
                COALESCE(NEW.materials_description, NEW.item_description, 'Materials'),
                NEW.preferred_date,
                COALESCE(v_provider_name, 'Delivery Provider'),
                v_provider_phone,
                NOW()
            );
            
            -- Update the delivery_request with tracking number
            NEW.tracking_number := v_tracking_num;
            
            RAISE NOTICE 'Created tracking number: % for delivery request: %', v_tracking_num, NEW.id;
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'Tracking number already exists for delivery request: %', NEW.id;
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating tracking number: %', SQLERRM;
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_tracking_on_accept ON delivery_requests;

CREATE TRIGGER trigger_create_tracking_on_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- 4. Also create trigger for INSERT (new delivery requests that are immediately assigned)
DROP TRIGGER IF EXISTS trigger_create_tracking_on_insert ON delivery_requests;

CREATE TRIGGER trigger_create_tracking_on_insert
    BEFORE INSERT ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status IN ('accepted', 'assigned') AND NEW.provider_id IS NOT NULL)
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- 5. Update RLS to allow broader access
DROP POLICY IF EXISTS "tracking_numbers_select" ON public.tracking_numbers;
CREATE POLICY "tracking_numbers_select" ON public.tracking_numbers 
FOR SELECT USING (true);  -- Allow all authenticated users to see tracking numbers

-- 6. Grant permissions
GRANT ALL ON public.tracking_numbers TO authenticated;
GRANT ALL ON public.tracking_history TO authenticated;

-- ============================================================
-- TEST: Create a tracking number for existing assigned deliveries
-- ============================================================
DO $$
DECLARE
    r RECORD;
    v_tracking_num TEXT;
    v_builder_user_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
BEGIN
    FOR r IN 
        SELECT dr.* 
        FROM delivery_requests dr
        WHERE dr.status IN ('assigned', 'accepted', 'in_transit')
        AND dr.provider_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM tracking_numbers tn WHERE tn.delivery_request_id = dr.id
        )
    LOOP
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Get builder user_id
        SELECT user_id INTO v_builder_user_id FROM profiles WHERE id = r.builder_id;
        IF v_builder_user_id IS NULL THEN
            v_builder_user_id := r.builder_id;
        END IF;
        
        -- Get provider info
        SELECT full_name, phone INTO v_provider_name, v_provider_phone
        FROM profiles WHERE user_id = r.provider_id OR id = r.provider_id LIMIT 1;
        
        -- Insert tracking number
        INSERT INTO tracking_numbers (
            tracking_number, delivery_request_id, builder_id, delivery_provider_id,
            status, delivery_address, materials_description, provider_name, provider_phone, accepted_at
        ) VALUES (
            v_tracking_num, r.id, v_builder_user_id, r.provider_id,
            'accepted', COALESCE(r.delivery_address, r.dropoff_address, 'N/A'),
            COALESCE(r.materials_description, r.item_description, 'Materials'),
            COALESCE(v_provider_name, 'Provider'), v_provider_phone, COALESCE(r.accepted_at, NOW())
        ) ON CONFLICT DO NOTHING;
        
        -- Update delivery request with tracking number
        UPDATE delivery_requests SET tracking_number = v_tracking_num WHERE id = r.id;
        
        RAISE NOTICE 'Created tracking % for delivery %', v_tracking_num, r.id;
    END LOOP;
END $$;

SELECT 'Migration complete! Check tracking_numbers table.' as result;
