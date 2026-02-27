-- ============================================================
-- DIAGNOSTIC AND FIX: Find and fix the delivery_provider_phone error
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Show ALL triggers on delivery_requests
SELECT 
    tgname as trigger_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'delivery_requests'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- Step 2: Show ALL functions that might be problematic
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.prosrc LIKE '%delivery_provider_phone%'
    OR p.prosrc LIKE '%delivery_provider_name%'
)
ORDER BY p.proname;

-- Step 3: NOW DROP EVERYTHING
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all triggers
    FOR r IN 
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'delivery_requests'::regclass
        AND tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON delivery_requests CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
    
    -- Drop all functions that reference delivery_provider columns
    FOR r IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosrc LIKE '%delivery_provider%'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || 
                    CASE WHEN r.args IS NOT NULL AND r.args != '' 
                         THEN '(' || r.args || ')' 
                         ELSE '()' 
                    END || ' CASCADE';
            RAISE NOTICE 'Dropped function: %', r.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop function %: %', r.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 4: Create clean tracking function (ONLY sets tracking_number)
CREATE OR REPLACE FUNCTION public.create_tracking_on_delivery_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tracking_num TEXT;
BEGIN
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        BEGIN
            INSERT INTO public.tracking_numbers (
                tracking_number, delivery_request_id, builder_id, delivery_provider_id,
                status, delivery_address, materials_description, provider_name, accepted_at
            )
            VALUES (
                v_tracking_num, NEW.id, NEW.builder_id, NEW.provider_id,
                'accepted', COALESCE(NEW.delivery_address, 'N/A'), 
                COALESCE(NEW.materials_description, 'Materials'), 'Delivery Provider', NOW()
            );
            NEW.tracking_number := v_tracking_num;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- Step 5: Create clean purchase order update function (ONLY updates purchase_orders)
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

-- Step 6: Create updated_at function
CREATE OR REPLACE FUNCTION update_delivery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate triggers
CREATE TRIGGER trigger_create_tracking_on_delivery_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

CREATE TRIGGER trigger_update_purchase_order_on_delivery_accept
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION update_purchase_order_on_delivery_accept();

CREATE TRIGGER trigger_update_delivery_requests_updated_at
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_requests_updated_at();

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.update_purchase_order_on_delivery_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tracking_on_delivery_accept() TO authenticated;

-- DONE! Check the output above to see what triggers/functions were found and dropped.
