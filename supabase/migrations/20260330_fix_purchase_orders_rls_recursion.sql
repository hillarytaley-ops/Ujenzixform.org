-- Fix: infinite recursion detected in policy for relation "purchase_orders"
-- Cause: purchase_orders SELECT policy queried delivery_requests, and
-- delivery_requests SELECT policy queried purchase_orders -> cycle.
-- Fix: use SECURITY DEFINER helper functions so the check runs without re-entering RLS.

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

COMMENT ON FUNCTION public.purchase_order_visible_to_delivery_provider(uuid) IS
  'RLS helper: avoids recursion by checking delivery_requests/purchase_orders as definer.';
COMMENT ON FUNCTION public.delivery_request_visible_to_supplier_for_po(uuid) IS
  'RLS helper: avoids recursion by checking purchase_orders as definer.';
