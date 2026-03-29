-- Supplier dashboard: list delivery_notes / GRNs / invoices without depending on per-row RLS + nested PO subqueries.
-- PostgREST still enforces that the caller is authenticated; functions use auth.uid() and SECURITY DEFINER to read rows.

CREATE OR REPLACE FUNCTION public.list_delivery_notes_for_supplier()
RETURNS SETOF public.delivery_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dn.*
  FROM public.delivery_notes dn
  LEFT JOIN public.purchase_orders po ON po.id = dn.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.user_id = auth.uid()
      AND (
        (dn.supplier_id IS NOT NULL AND s.id = dn.supplier_id)
        OR (po.id IS NOT NULL AND s.id = po.supplier_id)
      )
    )
    OR (dn.supplier_id IS NOT NULL AND dn.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
  )
  ORDER BY dn.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_goods_received_notes_for_supplier()
RETURNS SETOF public.goods_received_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.*
  FROM public.goods_received_notes g
  LEFT JOIN public.purchase_orders po ON po.id = g.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.user_id = auth.uid()
      AND (
        (g.supplier_id IS NOT NULL AND s.id = g.supplier_id)
        OR (po.id IS NOT NULL AND s.id = po.supplier_id)
      )
    )
    OR (g.supplier_id IS NOT NULL AND g.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
  )
  ORDER BY g.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_invoices_for_supplier()
RETURNS SETOF public.invoices
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.*
  FROM public.invoices i
  LEFT JOIN public.purchase_orders po ON po.id = i.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.user_id = auth.uid()
      AND (
        (i.supplier_id IS NOT NULL AND s.id = i.supplier_id)
        OR (po.id IS NOT NULL AND s.id = po.supplier_id)
      )
    )
    OR (i.supplier_id IS NOT NULL AND i.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
  )
  ORDER BY i.id DESC;
$$;

COMMENT ON FUNCTION public.list_delivery_notes_for_supplier() IS
  'Supplier dashboard: returns delivery_notes rows for the JWT user''s supplier account (by dn.supplier_id or linked PO).';
COMMENT ON FUNCTION public.list_goods_received_notes_for_supplier() IS
  'Supplier dashboard: returns GRN rows for the JWT user''s supplier account.';
COMMENT ON FUNCTION public.list_invoices_for_supplier() IS
  'Supplier dashboard: returns invoice rows for the JWT user''s supplier account.';

REVOKE ALL ON FUNCTION public.list_delivery_notes_for_supplier() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_goods_received_notes_for_supplier() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_invoices_for_supplier() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_delivery_notes_for_supplier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_goods_received_notes_for_supplier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_invoices_for_supplier() TO authenticated;
