-- Broaden list_*_for_supplier RPCs: some rows store supplier_id as public.suppliers.id,
-- others as auth.users id (legacy / mixed app paths). Match both via suppliers row.

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
        (dn.supplier_id IS NOT NULL AND (dn.supplier_id = s.id OR dn.supplier_id = s.user_id))
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
        )
      )
    )
    OR (dn.supplier_id IS NOT NULL AND dn.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
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
        (g.supplier_id IS NOT NULL AND (g.supplier_id = s.id OR g.supplier_id = s.user_id))
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
        )
      )
    )
    OR (g.supplier_id IS NOT NULL AND g.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
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
        (i.supplier_id IS NOT NULL AND (i.supplier_id = s.id OR i.supplier_id = s.user_id))
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
        )
      )
    )
    OR (i.supplier_id IS NOT NULL AND i.supplier_id = auth.uid())
    OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
  )
  ORDER BY i.id DESC;
$$;

COMMENT ON FUNCTION public.list_delivery_notes_for_supplier() IS
  'Supplier dashboard: DN rows where supplier_id / PO.supplier_id is suppliers.id or auth uid.';
