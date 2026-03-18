-- ============================================================
-- Fix update_order_in_transit: resolve provider name from
-- delivery_providers + profiles (join on dp.user_id = p.user_id)
-- so purchase_orders.delivery_provider_name is set correctly.
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
    IF ((NEW.status = 'accepted' OR NEW.status = 'assigned')
        AND (OLD.status IS NULL OR (OLD.status != 'accepted' AND OLD.status != 'assigned'))
        AND NEW.provider_id IS NOT NULL) THEN
        po_id := NEW.purchase_order_id;

        IF po_id IS NOT NULL THEN
            BEGIN
                SELECT
                    COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
                    COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), ''), NULL)
                INTO v_provider_name, v_provider_phone
                FROM delivery_providers dp
                LEFT JOIN profiles p ON p.user_id = dp.user_id
                WHERE dp.id = NEW.provider_id
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;

            IF v_provider_name IS NULL THEN
                v_provider_name := 'Delivery Provider';
            END IF;

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
                status = CASE WHEN status = 'dispatched' THEN 'in_transit' ELSE status END,
                in_transit_at = CASE WHEN status = 'dispatched' THEN NOW() ELSE in_transit_at END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                updated_at = NOW()
            WHERE id = po_id;

            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, NEW.status, 'Delivery provider ' || NEW.status || ' - ' || v_provider_name, NOW())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_order_in_transit() IS
  'Updates purchase_orders when delivery_requests are accepted or assigned. Resolves provider name from delivery_providers and profiles.';

-- Backfill: set delivery_provider_name for orders that have provider_id but missing name
UPDATE purchase_orders po
SET
  delivery_provider_name = COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
  delivery_provider_phone = COALESCE(NULLIF(TRIM(po.delivery_provider_phone), ''), NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), ''), po.delivery_provider_phone),
  updated_at = NOW()
FROM delivery_providers dp
LEFT JOIN profiles p ON p.user_id = dp.user_id
WHERE po.delivery_provider_id = dp.id
  AND (po.delivery_provider_name IS NULL OR TRIM(po.delivery_provider_name) = '');
