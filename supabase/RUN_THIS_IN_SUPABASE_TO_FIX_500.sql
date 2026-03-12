-- =============================================================================
-- FIX: POST /purchase_orders 500 (Internal Server Error) when requesting a quote
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================
-- Fixes: (1) trigger faults, (2) "infinite recursion detected in policy for
-- relation purchase_orders" by breaking the RLS cycle between purchase_orders
-- and delivery_requests.
-- =============================================================================

-- 0. FIX RLS INFINITE RECURSION (purchase_orders <-> delivery_requests)
--    Use SECURITY DEFINER helpers so policy checks don't re-enter RLS.
CREATE OR REPLACE FUNCTION public.purchase_order_visible_to_delivery_provider(po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id AND dr.provider_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_id AND po.delivery_provider_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "purchase_orders_delivery_provider_access" ON public.purchase_orders;
CREATE POLICY "purchase_orders_delivery_provider_access"
ON public.purchase_orders
FOR SELECT TO authenticated
USING (public.purchase_order_visible_to_delivery_provider(id));

-- Optional: break the other side so delivery_requests policy doesn't query po with RLS
CREATE OR REPLACE FUNCTION public.delivery_request_visible_to_supplier_for_po(dr_purchase_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = dr_purchase_order_id
      AND (po.supplier_id = auth.uid() OR po.supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()))
  );
$$;

DROP POLICY IF EXISTS "delivery_requests_supplier_read_own_po" ON public.delivery_requests;
CREATE POLICY "delivery_requests_supplier_read_own_po"
ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  purchase_order_id IS NOT NULL
  AND public.delivery_request_visible_to_supplier_for_po(purchase_order_id)
);

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
SELECT 'Triggers + RLS recursion fix applied. Try Request Quote again.' AS result;
