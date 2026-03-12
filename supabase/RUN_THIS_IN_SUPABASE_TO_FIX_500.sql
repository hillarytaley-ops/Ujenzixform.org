-- =============================================================================
-- FIX: POST /purchase_orders 500 (Internal Server Error) when requesting a quote
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================
-- The app now shows the real server error in the toast if something still fails.
-- If you still get 500 after running this, copy that message and fix the cause.
-- =============================================================================

-- 1. update_project_spending (runs on INSERT/UPDATE of purchase_orders)
CREATE OR REPLACE FUNCTION update_project_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_materials_total NUMERIC(15, 2);
    v_delivery_total NUMERIC(15, 2);
    v_order_count INTEGER;
BEGIN
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;
    BEGIN
        SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
        INTO v_materials_total, v_order_count
        FROM purchase_orders
        WHERE project_id = NEW.project_id
        AND status IN ('confirmed', 'dispatched', 'in_transit', 'delivered');
        SELECT COALESCE(SUM(COALESCE(estimated_cost, 0)), 0)
        INTO v_delivery_total
        FROM delivery_requests
        WHERE project_id = NEW.project_id
        AND status IN ('accepted', 'in_transit', 'delivered', 'completed');
        UPDATE builder_projects
        SET
            materials_spent = v_materials_total,
            delivery_spent = v_delivery_total,
            spent = v_materials_total + v_delivery_total + COALESCE(monitoring_spent, 0),
            total_orders = v_order_count,
            updated_at = NOW()
        WHERE id = NEW.project_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'update_project_spending: % (project_id=%)', SQLERRM, NEW.project_id;
    END;
    RETURN NEW;
END;
$$;

-- 2. sync_po_to_delivery_request_order_number (runs on INSERT/UPDATE when po_number set)
-- SECURITY DEFINER so the UPDATE on delivery_requests is not blocked by RLS.
CREATE OR REPLACE FUNCTION sync_po_to_delivery_request_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    RETURN NEW;
  END IF;
  BEGIN
    UPDATE delivery_requests
    SET order_number = NEW.po_number,
        updated_at = NOW()
    WHERE purchase_order_id = NEW.id
      AND (order_number IS NULL OR order_number = '' OR order_number LIKE 'PO-%');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_po_to_delivery_request_order_number: % (po_id=%)', SQLERRM, NEW.id;
  END;
  RETURN NEW;
END;
$$;

-- Done. Try "Request Quote" from the cart again.
SELECT 'Triggers updated. Try Request Quote again.' AS result;
