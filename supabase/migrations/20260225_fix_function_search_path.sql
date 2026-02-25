-- ============================================================
-- Fix Function Search Path Security Warning
-- Sets search_path to prevent search_path injection attacks
-- Created: February 25, 2026
-- ============================================================

-- Recreate the function with SET search_path = public
CREATE OR REPLACE FUNCTION public.create_tracking_on_delivery_accept()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tracking_num TEXT;
    v_builder_user_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
    v_supplier_id UUID;
    v_delivery_address TEXT;
BEGIN
    -- Only create tracking number when status changes to 'accepted' or 'assigned'
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Get builder user_id - delivery_requests only has builder_id (NOT buyer_id)
        v_builder_user_id := NEW.builder_id;
        
        -- Get provider info
        BEGIN
            SELECT full_name, phone INTO v_provider_name, v_provider_phone
            FROM public.profiles
            WHERE user_id = NEW.provider_id OR id = NEW.provider_id
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_provider_name := 'Delivery Provider';
            v_provider_phone := NULL;
        END;
        
        -- Get supplier_id from the related purchase order (if exists)
        v_supplier_id := NULL;
        IF NEW.purchase_order_id IS NOT NULL THEN
            BEGIN
                SELECT supplier_id INTO v_supplier_id
                FROM public.purchase_orders
                WHERE id = NEW.purchase_order_id;
            EXCEPTION WHEN OTHERS THEN
                v_supplier_id := NULL;
            END;
        END IF;
        
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
                supplier_id,
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
                v_supplier_id,
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
            
            RAISE NOTICE 'Created tracking number: % for delivery request: % with supplier: %', v_tracking_num, NEW.id, v_supplier_id;
        EXCEPTION 
            WHEN unique_violation THEN
                -- Tracking number already exists, skip
                RAISE NOTICE 'Tracking number already exists for delivery request: %', NEW.id;
            WHEN OTHERS THEN
                -- Log error but don't fail the update
                RAISE WARNING 'Could not create tracking number: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure trigger still exists
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON public.delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON public.delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.create_tracking_on_delivery_accept();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO anon;

-- ============================================================
-- Also fix any other functions that might have this issue
-- ============================================================

-- Fix record_qr_scan if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_qr_scan') THEN
        EXECUTE 'ALTER FUNCTION public.record_qr_scan SET search_path = public';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update record_qr_scan: %', SQLERRM;
END $$;

-- Fix assign_delivery_provider if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_delivery_provider') THEN
        EXECUTE 'ALTER FUNCTION public.assign_delivery_provider SET search_path = public';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update assign_delivery_provider: %', SQLERRM;
END $$;

-- Fix accept_delivery_assignment if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_delivery_assignment') THEN
        EXECUTE 'ALTER FUNCTION public.accept_delivery_assignment SET search_path = public';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update accept_delivery_assignment: %', SQLERRM;
END $$;

-- Fix increment_helpful_count if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_helpful_count') THEN
        EXECUTE 'ALTER FUNCTION public.increment_helpful_count SET search_path = public';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update increment_helpful_count: %', SQLERRM;
END $$;

-- Fix update_updated_at if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at SET search_path = public';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update update_updated_at: %', SQLERRM;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
