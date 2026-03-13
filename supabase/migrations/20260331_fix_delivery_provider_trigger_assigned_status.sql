-- ============================================================
-- Fix delivery provider trigger to also handle 'assigned' status
-- Currently only fires on 'accepted', but delivery can be 'assigned' too
-- Created: March 31, 2026
-- ============================================================

-- Update the function to also handle 'assigned' status
CREATE OR REPLACE FUNCTION public.update_order_in_transit()
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
    -- When delivery request is accepted OR assigned, update the linked purchase order
    -- This ensures purchase_orders.delivery_provider_id is set even when status is 'assigned'
    IF ((NEW.status = 'accepted' OR NEW.status = 'assigned') 
        AND (OLD.status IS NULL OR (OLD.status != 'accepted' AND OLD.status != 'assigned')) 
        AND NEW.provider_id IS NOT NULL) THEN
        po_id := NEW.purchase_order_id;
        
        IF po_id IS NOT NULL THEN
            -- Get provider name and phone from profiles or delivery_providers
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
            
            -- Update purchase order with delivery provider info
            UPDATE purchase_orders
            SET 
                delivery_provider_id = NEW.provider_id,
                delivery_provider_name = v_provider_name,
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = CASE 
                    WHEN status = 'dispatched' THEN 'in_transit' 
                    WHEN NEW.status = 'accepted' THEN 'accepted'
                    WHEN NEW.status = 'assigned' THEN 'assigned'
                    ELSE delivery_status
                END,
                status = CASE 
                    WHEN status = 'dispatched' THEN 'in_transit' 
                    ELSE status 
                END,
                in_transit_at = CASE 
                    WHEN status = 'dispatched' THEN NOW() 
                    ELSE in_transit_at 
                END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                updated_at = NOW()
            WHERE id = po_id;
            
            -- Log the status change
            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, NEW.status, 'Delivery provider ' || NEW.status || ' - ' || v_provider_name, NOW())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update trigger to also fire on 'assigned' status
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (
        (NEW.status = 'accepted' OR NEW.status = 'assigned') 
        AND (OLD.status IS NULL OR (OLD.status != 'accepted' AND OLD.status != 'assigned'))
        AND NEW.provider_id IS NOT NULL
    )
    EXECUTE FUNCTION update_order_in_transit();

COMMENT ON FUNCTION public.update_order_in_transit() IS
  'Updates purchase_orders when delivery_requests are accepted or assigned. Sets delivery_provider_id so dispatch scanner can validate provider assignment.';
