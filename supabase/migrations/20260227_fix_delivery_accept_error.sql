-- ============================================================
-- EMERGENCY FIX: Disable all triggers on delivery_requests that reference non-existent columns
-- This fixes the "column delivery_provider_phone does not exist" error
-- ============================================================

-- Drop ALL triggers on delivery_requests (both BEFORE and AFTER)
-- Use CASCADE to drop dependent objects
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_update_order_on_provider_accept ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_accept ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_insert ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_update_delivery_requests_updated_at ON delivery_requests CASCADE;
DROP TRIGGER IF EXISTS trigger_update_purchase_order_on_delivery_accept ON delivery_requests CASCADE;

-- Drop ALL functions that might be problematic
DROP FUNCTION IF EXISTS public.create_tracking_on_delivery_accept() CASCADE;
DROP FUNCTION IF EXISTS public.update_order_in_transit() CASCADE;
DROP FUNCTION IF EXISTS public.update_purchase_order_on_delivery_accept() CASCADE;

-- List all remaining triggers for debugging (will show in logs)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname, tgrelid::regclass
        FROM pg_trigger
        WHERE tgrelid = 'delivery_requests'::regclass
        AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
    LOOP
        RAISE NOTICE 'Found trigger: % on %', r.tgname, r.tgrelid;
    END LOOP;
END $$;

-- Create a NEW simple function that ONLY updates purchase_orders
-- This function will NOT try to set any columns on delivery_requests
CREATE OR REPLACE FUNCTION public.update_purchase_order_on_delivery_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
BEGIN
    -- Only run when status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') AND NEW.provider_id IS NOT NULL THEN
        po_id := NEW.purchase_order_id;
        
        IF po_id IS NOT NULL THEN
            -- Get provider info
            BEGIN
                SELECT 
                    COALESCE(p.full_name, dp.provider_name, dp.company_name, 'Delivery Provider'),
                    COALESCE(p.phone, dp.phone, NULL)
                INTO v_provider_name, v_provider_phone
                FROM profiles p
                FULL OUTER JOIN delivery_providers dp ON dp.id = NEW.provider_id
                WHERE (p.user_id = NEW.provider_id OR p.id = NEW.provider_id OR dp.id = NEW.provider_id)
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;
            
            -- Update ONLY purchase_orders - NEVER touch delivery_requests
            UPDATE purchase_orders
            SET 
                delivery_provider_id = NEW.provider_id,
                delivery_provider_name = v_provider_name,
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = 'accepted',
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                updated_at = NOW()
            WHERE id = po_id;
        END IF;
    END IF;
    
    -- Return NEW unchanged - do NOT modify delivery_requests record
    RETURN NEW;
END;
$$;

-- Create trigger as AFTER UPDATE only
DROP TRIGGER IF EXISTS trigger_update_purchase_order_on_delivery_accept ON delivery_requests;
CREATE TRIGGER trigger_update_purchase_order_on_delivery_accept
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION update_purchase_order_on_delivery_accept();

-- Recreate the tracking function WITHOUT trying to set delivery_provider columns
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
    -- Only create tracking when status changes to accepted/assigned
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Get builder user_id
        v_builder_user_id := NEW.builder_id;
        
        -- Get provider info (for tracking_numbers table only, NOT for delivery_requests)
        BEGIN
            SELECT full_name, phone INTO v_provider_name, v_provider_phone
            FROM public.profiles
            WHERE user_id = NEW.provider_id OR id = NEW.provider_id
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_provider_name := 'Delivery Provider';
            v_provider_phone := NULL;
        END;
        
        -- Get supplier_id from purchase_order
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
        
        -- Get delivery address
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
            
            -- ONLY set tracking_number on delivery_requests - DO NOT set delivery_provider_name or delivery_provider_phone
            NEW.tracking_number := v_tracking_num;
            
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE NOTICE 'Tracking number already exists';
            WHEN OTHERS THEN
                RAISE WARNING 'Could not create tracking number: %', SQLERRM;
        END;
    END IF;
    
    -- Return NEW - only tracking_number is set, nothing else
    RETURN NEW;
END;
$$;

-- Recreate tracking trigger as BEFORE UPDATE
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- Recreate updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_requests_updated_at
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_requests_updated_at();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_purchase_order_on_delivery_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO authenticated;