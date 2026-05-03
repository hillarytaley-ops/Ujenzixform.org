-- Supplier invoice list empty while builder sees rows: PO/invoice often store
-- suppliers.id, but some paths store suppliers.user_id (auth uid or profile id).
-- list_invoices_for_supplier(p_supplier_id) previously only matched p_supplier_id OR auth.uid(),
-- missing po.supplier_id = suppliers.user_id when that user_id is not auth.uid() (e.g. profile id).

CREATE OR REPLACE FUNCTION public.list_invoices_for_supplier(p_supplier_id uuid DEFAULT NULL)
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
    (
      p_supplier_id IS NOT NULL
      AND public.supplier_row_owned_by_caller(p_supplier_id)
      AND (
        i.supplier_id = p_supplier_id
        OR i.supplier_id = auth.uid()
        OR i.supplier_id = (SELECT su.user_id FROM public.suppliers su WHERE su.id = p_supplier_id AND su.user_id IS NOT NULL)
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (
            po.supplier_id = p_supplier_id
            OR po.supplier_id = auth.uid()
            OR po.supplier_id = (SELECT su2.user_id FROM public.suppliers su2 WHERE su2.id = p_supplier_id AND su2.user_id IS NOT NULL)
          )
        )
      )
    )
    OR (
      p_supplier_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.suppliers s
          WHERE public.supplier_row_owned_by_caller(s.id)
          AND (
            (i.supplier_id IS NOT NULL AND (i.supplier_id = s.id OR i.supplier_id = s.user_id))
            OR (
              po.id IS NOT NULL
              AND po.supplier_id IS NOT NULL
              AND (po.supplier_id = s.id OR po.supplier_id = s.user_id OR po.supplier_id = auth.uid())
            )
          )
        )
        OR (i.supplier_id IS NOT NULL AND i.supplier_id = auth.uid())
        OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
      )
    )
  )
  ORDER BY i.id DESC;
$$;

COMMENT ON FUNCTION public.list_invoices_for_supplier(uuid) IS
  'Supplier dashboard invoices: match invoice/PO supplier_id to suppliers.id, auth.uid(), or suppliers.user_id for the resolved suppliers.id (p_supplier_id). Legacy NULL arg uses supplier_row_owned_by_caller for email-linked accounts.';
