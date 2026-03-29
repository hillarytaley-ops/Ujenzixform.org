-- Align delivery_note_visible_to_supplier / grn_visible_to_supplier / invoice_visible_to_supplier
-- with list_*_for_supplier (20260329350000): suppliers.user_id may differ from auth.uid() when the
-- row is linked by matching email (supplier_row_owned_by_caller). Without this, Mark viewed RPC
-- returns 42501 while the GRN list still loads.

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
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE public.supplier_row_owned_by_caller(s.id)
        AND (
          (dn.supplier_id IS NOT NULL AND dn.supplier_id = s.id)
          OR (
            po.id IS NOT NULL
            AND po.supplier_id IS NOT NULL
            AND (po.supplier_id = s.id OR po.supplier_id = auth.uid())
          )
        )
      )
      OR (dn.supplier_id IS NOT NULL AND dn.supplier_id = auth.uid())
      OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
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
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE public.supplier_row_owned_by_caller(s.id)
        AND (
          (g.supplier_id IS NOT NULL AND g.supplier_id = s.id)
          OR (
            po.id IS NOT NULL
            AND po.supplier_id IS NOT NULL
            AND (po.supplier_id = s.id OR po.supplier_id = auth.uid())
          )
        )
      )
      OR (g.supplier_id IS NOT NULL AND g.supplier_id = auth.uid())
      OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
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
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE public.supplier_row_owned_by_caller(s.id)
        AND (
          (i.supplier_id IS NOT NULL AND i.supplier_id = s.id)
          OR (
            po.id IS NOT NULL
            AND po.supplier_id IS NOT NULL
            AND (po.supplier_id = s.id OR po.supplier_id = auth.uid())
          )
        )
      )
      OR (i.supplier_id IS NOT NULL AND i.supplier_id = auth.uid())
      OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
    )
  );
$$;

COMMENT ON FUNCTION public.delivery_note_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on delivery_notes; includes email-linked supplier_row_owned_by_caller.';
COMMENT ON FUNCTION public.grn_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on goods_received_notes; includes email-linked supplier_row_owned_by_caller.';
COMMENT ON FUNCTION public.invoice_visible_to_supplier(uuid) IS
  'RLS helper: supplier SELECT on invoices; includes email-linked supplier_row_owned_by_caller.';
