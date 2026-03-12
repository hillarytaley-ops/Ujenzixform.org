-- Make update_project_spending trigger fault-tolerant so purchase_orders INSERT never fails with 500
-- when builder_projects update fails (e.g. missing columns in some environments)
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
        -- Do not re-raise: allow purchase_orders insert to succeed
    END;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_project_spending() IS 'Updates builder_projects spending; faults are logged and do not abort purchase_orders insert.';
