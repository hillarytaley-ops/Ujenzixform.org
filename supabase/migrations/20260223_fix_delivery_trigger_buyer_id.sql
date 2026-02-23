-- ============================================================
-- Fix delivery_requests trigger - remove reference to non-existent buyer_id
-- The delivery_requests table only has builder_id, not buyer_id
-- Created: February 23, 2026
-- ============================================================

-- Drop and recreate the trigger function with correct column references
CREATE OR REPLACE FUNCTION create_tracking_on_delivery_accept()
RETURNS TRIGGER AS $$
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
            FROM profiles
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
                FROM purchase_orders
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_tracking_on_delivery_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION create_tracking_on_delivery_accept() TO anon;

-- ============================================================
-- Migration Complete
-- ============================================================
