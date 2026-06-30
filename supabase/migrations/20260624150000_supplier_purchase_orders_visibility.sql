-- CO quote requests must appear on the chosen supplier's dashboard.
-- Fixes: email-linked suppliers, suppliers.user_id = profiles.id, legacy PO.supplier_id = user_id.

CREATE OR REPLACE FUNCTION public.purchase_order_visible_to_supplier(p_po_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_po_supplier_id IS NOT NULL
    AND (
      p_po_supplier_id = auth.uid()
      OR public.supplier_row_owned_by_caller(p_po_supplier_id)
      OR p_po_supplier_id IN (
        SELECT unnest(public.get_supplier_scope_ids_for_current_user())
      )
      OR EXISTS (
        SELECT 1
        FROM public.suppliers s
        WHERE (s.id = p_po_supplier_id OR s.user_id = p_po_supplier_id)
          AND (
            s.user_id = auth.uid()
            OR public.supplier_row_owned_by_caller(s.id)
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = s.user_id
                AND p.user_id = auth.uid()
            )
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.purchase_order_visible_to_supplier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_order_visible_to_supplier(uuid) TO authenticated;

COMMENT ON FUNCTION public.purchase_order_visible_to_supplier(uuid) IS
  'True when auth.uid() owns the supplier on a purchase_order (id, user_id, profile chain, email-linked).';

DROP POLICY IF EXISTS "purchase_orders_supplier_view" ON public.purchase_orders;

CREATE POLICY "purchase_orders_supplier_view"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (public.purchase_order_visible_to_supplier(supplier_id));

CREATE OR REPLACE FUNCTION public.get_supplier_orders_for_current_user(_limit integer DEFAULT 500)
RETURNS SETOF public.purchase_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT po.*
  FROM public.purchase_orders po
  WHERE public.purchase_order_visible_to_supplier(po.supplier_id)
  ORDER BY po.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 500), 1);
$$;

REVOKE ALL ON FUNCTION public.get_supplier_orders_for_current_user(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_orders_for_current_user(integer) TO authenticated;

COMMENT ON FUNCTION public.get_supplier_orders_for_current_user(integer) IS
  'Supplier dashboard orders: all ownership paths (suppliers.id, user_id, profile chain, email-linked).';
