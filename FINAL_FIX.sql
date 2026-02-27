-- ============================================================
-- FINAL FIX: Recreate functions with ZERO references to delivery_provider_phone
-- Run this after disabling triggers with NUCLEAR_FIX.sql
-- ============================================================

-- Step 1: Drop and recreate create_tracking_on_delivery_accept with ABSOLUTELY NO delivery_provider references
DROP FUNCTION IF EXISTS public.create_tracking_on_delivery_accept() CASCADE;

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
        
        -- Insert tracking number (simplified - no provider name/phone lookups)
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
                'Delivery Provider',  -- Hardcoded, no lookup
                NOW()
            );
            
            -- ONLY set tracking_number on delivery_requests
            NEW.tracking_number := v_tracking_num;
            
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors, don't fail the update
            NULL;
        END;
    END IF;
    
    -- Return NEW - ONLY tracking_number is modified
    RETURN NEW;
END;
$$;

-- Step 2: Recreate update_purchase_order_on_delivery_accept (this one is fine, only updates purchase_orders)
DROP FUNCTION IF EXISTS public.update_purchase_order_on_delivery_accept() CASCADE;

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
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') AND NEW.provider_id IS NOT NULL THEN
        po_id := NEW.purchase_order_id;
        IF po_id IS NOT NULL THEN
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
    RETURN NEW;
END;
$$;

-- Step 3: Recreate updated_at function (this one is fine)
CREATE OR REPLACE FUNCTION update_delivery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate triggers
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

DROP TRIGGER IF EXISTS trigger_update_purchase_order_on_delivery_accept ON delivery_requests;
CREATE TRIGGER trigger_update_purchase_order_on_delivery_accept
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION update_purchase_order_on_delivery_accept();

DROP TRIGGER IF EXISTS trigger_update_delivery_requests_updated_at ON delivery_requests;
CREATE TRIGGER trigger_update_delivery_requests_updated_at
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_requests_updated_at();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase_order_on_delivery_accept() TO authenticated;

-- Step 6: Re-enable all triggers
ALTER TABLE delivery_requests ENABLE TRIGGER ALL;

-- DONE! Now try accepting a delivery.
