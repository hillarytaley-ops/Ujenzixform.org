-- ============================================================
-- EMERGENCY FIX: Disable all triggers on delivery_requests that reference non-existent columns
-- This fixes the "column delivery_provider_phone does not exist" error
-- ============================================================

-- Drop ALL triggers on delivery_requests (both BEFORE and AFTER)
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
DROP TRIGGER IF EXISTS trigger_update_order_on_provider_accept ON delivery_requests;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_delivery_accept ON delivery_requests;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_accept ON delivery_requests;
DROP TRIGGER IF EXISTS trigger_create_tracking_on_insert ON delivery_requests;
DROP TRIGGER IF EXISTS trigger_update_delivery_requests_updated_at ON delivery_requests;

-- Drop the problematic function that might be trying to set NEW columns
DROP FUNCTION IF EXISTS public.create_tracking_on_delivery_accept() CASCADE;

-- Drop the problematic function completely
DROP FUNCTION IF EXISTS public.update_order_in_transit() CASCADE;

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
CREATE TRIGGER trigger_update_purchase_order_on_delivery_accept
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION update_purchase_order_on_delivery_accept();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_purchase_order_on_delivery_accept() TO authenticated;
