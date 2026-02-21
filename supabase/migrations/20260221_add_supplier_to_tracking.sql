-- ============================================================
-- Add Supplier ID to Tracking Numbers
-- Ensures suppliers can see tracking numbers for their orders
-- Created: February 21, 2026
-- ============================================================

-- 1. Add index for supplier_id if not exists
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_supplier ON public.tracking_numbers(supplier_id);

-- 2. Update RLS policy to allow suppliers to see their tracking numbers
DROP POLICY IF EXISTS "tracking_numbers_select" ON public.tracking_numbers;
CREATE POLICY "tracking_numbers_select" ON public.tracking_numbers 
FOR SELECT USING (
    builder_id = auth.uid() OR 
    delivery_provider_id = auth.uid() OR
    supplier_id = auth.uid() OR
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Update existing tracking numbers to include supplier_id from purchase_orders
-- (delivery_requests doesn't have supplier_id, but purchase_orders does)
UPDATE public.tracking_numbers tn
SET supplier_id = po.supplier_id
FROM purchase_orders po
WHERE tn.purchase_order_id = po.id
AND tn.supplier_id IS NULL
AND po.supplier_id IS NOT NULL;

-- 4. Also try to get supplier_id via delivery_requests -> purchase_orders link
UPDATE public.tracking_numbers tn
SET supplier_id = po.supplier_id
FROM delivery_requests dr
JOIN purchase_orders po ON dr.purchase_order_id = po.id
WHERE tn.delivery_request_id = dr.id
AND tn.supplier_id IS NULL
AND po.supplier_id IS NOT NULL;

-- 5. Update the trigger function to include supplier_id
CREATE OR REPLACE FUNCTION create_tracking_on_delivery_accept()
RETURNS TRIGGER AS $$
DECLARE
    v_tracking_num TEXT;
    v_builder_user_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
    v_delivery_address TEXT;
    v_supplier_id UUID;
BEGIN
    -- Only create tracking number when status changes to 'accepted' or 'assigned'
    IF (TG_OP = 'UPDATE' AND 
        (NEW.status = 'accepted' OR NEW.status = 'assigned') AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'assigned')) AND
        NEW.provider_id IS NOT NULL) THEN
        
        -- Generate tracking number
        v_tracking_num := 'TRK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        
        -- Get builder user_id (may be stored as builder_id or buyer_id)
        v_builder_user_id := COALESCE(NEW.builder_id, NEW.buyer_id);
        
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
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'Tracking number already exists for delivery request: %', NEW.id;
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating tracking number: %', SQLERRM;
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_tracking_on_accept ON delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_accept
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- ============================================================
-- Migration Complete
-- ============================================================
SELECT 'Tracking numbers now include supplier_id!' as result;
