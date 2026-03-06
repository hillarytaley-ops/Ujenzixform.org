-- ============================================================
-- Fix Missing delivery_provider_id in purchase_orders
-- Created: March 5, 2026
-- 
-- Issue: When delivery requests are accepted, the trigger should
-- update purchase_orders.delivery_provider_id, but some records
-- may have been missed. This migration backfills the missing data.
-- ============================================================

-- ============================================================
-- 1. Update purchase_orders with delivery_provider_id from delivery_requests
-- ============================================================
UPDATE purchase_orders po
SET 
    delivery_provider_id = dr.provider_id,
    delivery_provider_name = COALESCE(
        po.delivery_provider_name,
        p.full_name,
        dp.provider_name,
        'Delivery Provider'
    ),
    delivery_provider_phone = COALESCE(
        po.delivery_provider_phone,
        p.phone,
        dp.phone
    ),
    delivery_status = CASE 
        WHEN po.delivery_status IS NULL THEN 'accepted'
        WHEN po.delivery_status = 'pending' THEN 'accepted'
        ELSE po.delivery_status
    END,
    delivery_assigned_at = COALESCE(po.delivery_assigned_at, dr.accepted_at, NOW()),
    updated_at = NOW()
FROM delivery_requests dr
LEFT JOIN profiles p ON (p.user_id = dr.provider_id OR p.id = dr.provider_id)
LEFT JOIN delivery_providers dp ON (dp.id = dr.provider_id OR dp.user_id = dr.provider_id)
WHERE po.id = dr.purchase_order_id
  AND dr.provider_id IS NOT NULL
  AND dr.status = 'accepted'
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id);

-- Log how many records were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % purchase_orders with delivery_provider_id from delivery_requests', updated_count;
END $$;

-- ============================================================
-- 2. Also update from delivery_requests with status 'assigned'
-- (in case some are in assigned state but should have provider_id)
-- ============================================================
UPDATE purchase_orders po
SET 
    delivery_provider_id = dr.provider_id,
    delivery_provider_name = COALESCE(
        po.delivery_provider_name,
        p.full_name,
        dp.provider_name,
        'Delivery Provider'
    ),
    delivery_provider_phone = COALESCE(
        po.delivery_provider_phone,
        p.phone,
        dp.phone
    ),
    delivery_status = CASE 
        WHEN po.delivery_status IS NULL THEN 'assigned'
        WHEN po.delivery_status = 'pending' THEN 'assigned'
        ELSE po.delivery_status
    END,
    delivery_assigned_at = COALESCE(po.delivery_assigned_at, dr.assigned_at, NOW()),
    updated_at = NOW()
FROM delivery_requests dr
LEFT JOIN profiles p ON (p.user_id = dr.provider_id OR p.id = dr.provider_id)
LEFT JOIN delivery_providers dp ON (dp.id = dr.provider_id OR dp.user_id = dr.provider_id)
WHERE po.id = dr.purchase_order_id
  AND dr.provider_id IS NOT NULL
  AND dr.status = 'assigned'
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id);

-- Log how many records were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % purchase_orders with delivery_provider_id from assigned delivery_requests', updated_count;
END $$;

-- ============================================================
-- 3. Ensure the trigger function is correct and will work going forward
-- ============================================================
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
    -- When delivery request is accepted or assigned, update the linked purchase order
    IF (NEW.status = 'accepted' OR NEW.status = 'assigned') 
       AND (OLD.status IS NULL OR OLD.status != NEW.status) 
       AND NEW.provider_id IS NOT NULL THEN
        po_id := NEW.purchase_order_id;
        
        IF po_id IS NOT NULL THEN
            -- Get provider name and phone from profiles or delivery_providers
            BEGIN
                SELECT 
                    COALESCE(p.full_name, dp.provider_name, 'Delivery Provider'),
                    COALESCE(p.phone, dp.phone, NULL)
                INTO v_provider_name, v_provider_phone
                FROM profiles p
                FULL OUTER JOIN delivery_providers dp ON (dp.id = NEW.provider_id OR dp.user_id = NEW.provider_id)
                WHERE (p.user_id = NEW.provider_id OR p.id = NEW.provider_id OR dp.id = NEW.provider_id OR dp.user_id = NEW.provider_id)
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;
            
            -- Update purchase order with delivery provider info
            UPDATE purchase_orders
            SET 
                delivery_provider_id = NEW.provider_id,  -- CRITICAL: Set the provider_id
                delivery_provider_name = COALESCE(v_provider_name, delivery_provider_name),
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = CASE 
                    WHEN NEW.status = 'accepted' THEN 'accepted'
                    WHEN NEW.status = 'assigned' THEN 'assigned'
                    WHEN status = 'dispatched' THEN 'in_transit' 
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

-- Ensure trigger exists and fires on both 'accepted' and 'assigned' status changes
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (
        (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
        OR 
        (NEW.status = 'assigned' AND (OLD.status IS NULL OR OLD.status != 'assigned'))
        OR
        (NEW.provider_id IS NOT NULL AND (OLD.provider_id IS NULL OR OLD.provider_id != NEW.provider_id))
    )
    EXECUTE FUNCTION update_order_in_transit();

-- ============================================================
-- Migration Complete
-- ============================================================
