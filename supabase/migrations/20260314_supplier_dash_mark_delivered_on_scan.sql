-- ============================================================
-- Supplier dashboard: mark order as delivered when delivery scans all items
-- Ensures update_order_status_from_items also updates delivery_requests
-- and that history insert cannot roll back PO/DR updates.
-- Created: March 14, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_status_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    total_items INTEGER;
    dispatched_items INTEGER;
    received_items INTEGER;
    new_order_status TEXT;
BEGIN
    po_id := NEW.purchase_order_id;

    IF po_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE dispatch_scanned = TRUE),
        COUNT(*) FILTER (WHERE receive_scanned = TRUE)
    INTO total_items, dispatched_items, received_items
    FROM material_items
    WHERE purchase_order_id = po_id;

    IF received_items = total_items AND total_items > 0 THEN
        new_order_status := 'delivered';

        UPDATE purchase_orders
        SET order_status = 'delivered',
            status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;

        -- So supplier dashboard shows order as delivered when delivery scans
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = po_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');

    ELSIF received_items > 0 THEN
        new_order_status := 'partially_delivered';
        UPDATE purchase_orders
        SET order_status = 'partially_delivered',
            updated_at = NOW()
        WHERE id = po_id;

    ELSIF dispatched_items = total_items AND total_items > 0 THEN
        new_order_status := 'dispatched';
        UPDATE purchase_orders
        SET order_status = 'dispatched',
            status = 'dispatched',
            dispatched_at = COALESCE(dispatched_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;

    ELSIF dispatched_items > 0 THEN
        new_order_status := 'partially_dispatched';
        UPDATE purchase_orders
        SET order_status = 'partially_dispatched',
            updated_at = NOW()
        WHERE id = po_id;
    END IF;

    -- Log only if we have a status; don't let history insert roll back PO/DR updates
    IF new_order_status IS NOT NULL THEN
        BEGIN
            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, new_order_status, 'Auto-updated from QR scan', NOW());
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trigger_update_order_status ON material_items;
CREATE TRIGGER trigger_update_order_status
    AFTER UPDATE OF dispatch_scanned, receive_scanned, status ON material_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status_from_items();

COMMENT ON FUNCTION public.update_order_status_from_items() IS
  'When material_items receive_scanned/dispatch_scanned change: updates purchase_orders and delivery_requests so supplier and provider dashboards show delivered/dispatched.';
