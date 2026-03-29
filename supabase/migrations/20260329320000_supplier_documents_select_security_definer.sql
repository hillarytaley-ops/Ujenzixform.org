-- Supplier SELECT on delivery_notes / goods_received_notes / invoices often uses EXISTS (… purchase_orders …).
-- Those subqueries run with the caller's RLS; if PO visibility rules do not expose the row inside the subquery,
-- the policy fails and suppliers see zero documents even when DN/GRN/invoice rows exist.
-- Pattern matches 20260330_fix_purchase_orders_rls_recursion.sql (SECURITY DEFINER helpers).

CREATE OR REPLACE FUNCTION public.delivery_note_visible_to_supplier(dn_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_notes dn
    LEFT JOIN public.purchase_orders po ON po.id = dn.purchase_order_id
    WHERE dn.id = dn_id
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.user_id = auth.uid()
        AND (
          s.id = dn.supplier_id
          OR (po.id IS NOT NULL AND s.id = po.supplier_id)
        )
      )
      OR dn.supplier_id = auth.uid()
      OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.grn_visible_to_supplier(grn_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.goods_received_notes g
    LEFT JOIN public.purchase_orders po ON po.id = g.purchase_order_id
    WHERE g.id = grn_id
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.user_id = auth.uid()
        AND (
          s.id = g.supplier_id
          OR (po.id IS NOT NULL AND s.id = po.supplier_id)
        )
      )
      OR g.supplier_id = auth.uid()
      OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.invoice_visible_to_supplier(inv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invoices i
    LEFT JOIN public.purchase_orders po ON po.id = i.purchase_order_id
    WHERE i.id = inv_id
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.user_id = auth.uid()
        AND (
          s.id = i.supplier_id
          OR (po.id IS NOT NULL AND s.id = po.supplier_id)
        )
      )
      OR i.supplier_id = auth.uid()
      OR (po.id IS NOT NULL AND po.supplier_id = auth.uid())
    )
  );
$$;

COMMENT ON FUNCTION public.delivery_note_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on delivery_notes without PO subquery RLS gaps.';
COMMENT ON FUNCTION public.grn_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on goods_received_notes without PO subquery RLS gaps.';
COMMENT ON FUNCTION public.invoice_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on invoices without PO subquery RLS gaps.';

GRANT EXECUTE ON FUNCTION public.delivery_note_visible_to_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grn_visible_to_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_visible_to_supplier(uuid) TO authenticated;

DROP POLICY IF EXISTS "Suppliers can select delivery notes definer" ON public.delivery_notes;
CREATE POLICY "Suppliers can select delivery notes definer"
  ON public.delivery_notes
  FOR SELECT
  TO authenticated
  USING (public.delivery_note_visible_to_supplier(id));

DROP POLICY IF EXISTS "Suppliers can select GRNs definer" ON public.goods_received_notes;
CREATE POLICY "Suppliers can select GRNs definer"
  ON public.goods_received_notes
  FOR SELECT
  TO authenticated
  USING (public.grn_visible_to_supplier(id));

DROP POLICY IF EXISTS "Suppliers can select invoices definer" ON public.invoices;
CREATE POLICY "Suppliers can select invoices definer"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (public.invoice_visible_to_supplier(id));
