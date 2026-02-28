-- ============================================================
-- Fix delivery provider trigger to ensure purchase_orders updates
-- when delivery provider accepts a request
-- Created: February 27, 2026
-- ============================================================

-- Update the function to handle both 'accepted' and 'assigned' statuses
-- and also fire when provider_id is set (even if status doesn't change)
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
    -- When delivery request is accepted/assigned AND provider_id is set, update the linked purchase order
    -- Fire if:
    -- 1. Status changed to 'accepted' or 'assigned' AND provider_id is set
    -- 2. OR provider_id was just set (was NULL, now has value) AND status is 'accepted' or 'assigned'
    IF NEW.provider_id IS NOT NULL 
       AND (NEW.status IN ('accepted', 'assigned') OR OLD.status IN ('accepted', 'assigned'))
       AND (OLD.provider_id IS NULL OR OLD.provider_id != NEW.provider_id OR OLD.status != NEW.status) THEN
        
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
                    WHEN NEW.status = 'accepted' OR NEW.status = 'assigned' THEN 'accepted'
                    ELSE delivery_status
                END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                delivery_accepted_at = CASE 
                    WHEN NEW.status = 'accepted' THEN COALESCE(delivery_accepted_at, NOW())
                    ELSE delivery_accepted_at
                END,
                updated_at = NOW()
            WHERE id = po_id;
            
            -- Log the status change
            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, 'accepted', 'Delivery provider accepted - ' || v_provider_name, NOW())
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Updated purchase_order % with delivery provider % (%)', po_id, v_provider_name, NEW.provider_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update trigger to fire on status OR provider_id changes
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (
        (NEW.status IN ('accepted', 'assigned') AND NEW.provider_id IS NOT NULL)
        OR (NEW.provider_id IS NOT NULL AND (OLD.provider_id IS NULL OR OLD.provider_id != NEW.provider_id))
    )
    EXECUTE FUNCTION update_order_in_transit();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_order_in_transit() TO authenticated;
