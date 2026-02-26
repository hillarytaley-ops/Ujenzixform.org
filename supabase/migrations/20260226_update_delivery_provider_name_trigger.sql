-- ============================================================
-- Update delivery provider trigger to also set provider name
-- Created: February 26, 2026
-- ============================================================

-- Update the function to also set delivery_provider_name
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
    -- When delivery request is accepted, update the linked purchase order
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') AND NEW.provider_id IS NOT NULL THEN
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
                    ELSE 'accepted' 
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
            VALUES (po_id, 'accepted', 'Delivery provider accepted - ' || v_provider_name, NOW())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION update_order_in_transit();
