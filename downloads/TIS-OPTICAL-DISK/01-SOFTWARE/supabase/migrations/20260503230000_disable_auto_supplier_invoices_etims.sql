-- Stop automatic public.invoices rows: KRA eTIMS / integrator is the tax receipt path.
-- 1) GRN: supplier viewing GRN must not create invoices (legacy trigger must stay off).
-- 2) PO quote accept: no longer insert draft supplier invoices (eTIMS-first workflow).

DROP TRIGGER IF EXISTS trigger_auto_create_invoice ON public.goods_received_notes;

DROP TRIGGER IF EXISTS trigger_create_invoice_on_po_quote_accept ON public.purchase_orders;

CREATE OR REPLACE FUNCTION public.create_invoice_on_purchase_order_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Previously inserted a draft invoices row on quote acceptance. Disabled 2026-05-03:
  -- suppliers use KRA eTIMS (integrator); delivery confirmation ends at GRN viewed by supplier.
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_on_purchase_order_quote_accepted() IS
  'No-op: automatic draft invoices on quote accept were removed in favour of eTIMS-generated receipts.';

COMMENT ON FUNCTION public.auto_create_invoice() IS
  'Legacy no longer used: GRN viewed_by_supplier must not create invoices. Trigger removed; eTIMS is the tax receipt path.';
