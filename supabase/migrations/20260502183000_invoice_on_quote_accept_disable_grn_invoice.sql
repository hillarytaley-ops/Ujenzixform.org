-- Supplier invoice (public.invoices) is created when the builder accepts a quote on the purchase order,
-- not when the supplier marks GRN as viewed. GRN remains for delivery / receipt confirmation only.
-- KRA eTIMS (integrator) submission is separate: app may call submit after quote accept (client) or supplier eTIMS test.

-- 1) Stop auto-creating invoices from GRN supplier view
DROP TRIGGER IF EXISTS trigger_auto_create_invoice ON public.goods_received_notes;

COMMENT ON FUNCTION public.auto_create_invoice() IS
  'Legacy: previously created a draft invoices row when GRN status became viewed_by_supplier. '
  'Superseded 2026-05-02 by create_invoice_on_purchase_order_quote_accepted (quote accept on purchase_orders). '
  'Trigger removed; function kept for reference / manual calls.';

-- 2) Create draft supplier invoice when quote is accepted (purchase_orders)
CREATE OR REPLACE FUNCTION public.create_invoice_on_purchase_order_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_subtotal NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_has_invoice_date BOOLEAN;
  v_fire BOOLEAN := FALSE;
  v_builder UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Primary path: convert_quote_to_order sets quote_accepted_at on first accept
  IF NEW.quote_accepted_at IS NOT NULL AND (OLD.quote_accepted_at IS NULL) THEN
    v_fire := TRUE;
  END IF;

  -- Secondary: some UIs set status to confirmed without going through quote_accepted
  IF NOT v_fire
     AND NEW.status = 'confirmed'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM 'confirmed'
     AND COALESCE(OLD.quote_accepted_at, NULL) IS NULL
     AND COALESCE(OLD.status, '') IN (
       'quoted', 'quote_viewed_by_builder', 'quote_responded', 'quote_revised', 'quote_created'
     )
  THEN
    v_fire := TRUE;
  END IF;

  IF NOT v_fire THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices inv
    WHERE inv.purchase_order_id = NEW.id
      AND inv.status IS DISTINCT FROM 'cancelled'
  ) THEN
    RETURN NEW;
  END IF;

  v_builder := NEW.buyer_id;

  IF v_builder IS NULL OR NEW.supplier_id IS NULL THEN
    RAISE NOTICE 'create_invoice_on_po_quote_accept: missing buyer_id or supplier_id for PO %', NEW.id;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_date'
  )
  INTO v_has_invoice_date;

  SELECT COALESCE(MAX(CAST(SUBSTRING(inv.invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_invoice_number
  FROM public.invoices inv
  WHERE inv.invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  v_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_invoice_number::TEXT, 4, '0');

  v_subtotal := COALESCE(NEW.total_amount, 0);
  v_total := v_subtotal;

  IF v_has_invoice_date THEN
    INSERT INTO public.invoices (
      invoice_number,
      purchase_order_id,
      grn_id,
      supplier_id,
      builder_id,
      items,
      subtotal,
      total_amount,
      invoice_date,
      due_date,
      status,
      payment_status,
      is_editable,
      created_by
    ) VALUES (
      v_invoice_number,
      NEW.id,
      NULL,
      NEW.supplier_id,
      v_builder,
      COALESCE(NEW.items, '[]'::jsonb),
      v_subtotal,
      v_total,
      CURRENT_DATE,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'draft',
      'pending',
      TRUE,
      NULL
    );
  ELSE
    INSERT INTO public.invoices (
      invoice_number,
      purchase_order_id,
      grn_id,
      supplier_id,
      builder_id,
      items,
      subtotal,
      total_amount,
      due_date,
      status,
      payment_status,
      is_editable,
      created_by
    ) VALUES (
      v_invoice_number,
      NEW.id,
      NULL,
      NEW.supplier_id,
      v_builder,
      COALESCE(NEW.items, '[]'::jsonb),
      v_subtotal,
      v_total,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'draft',
      'pending',
      TRUE,
      NULL
    );
  END IF;

  RAISE NOTICE 'Auto-created invoice % for PO % (quote accept)', v_invoice_number, NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_invoice_on_po_quote_accept ON public.purchase_orders;
CREATE TRIGGER trigger_create_invoice_on_po_quote_accept
  AFTER UPDATE OF quote_accepted_at, status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invoice_on_purchase_order_quote_accepted();

COMMENT ON FUNCTION public.create_invoice_on_purchase_order_quote_accepted() IS
  'Inserts a draft invoices row when quote_accepted_at is first set or when status becomes confirmed from a quote-pending state. grn_id is NULL until optional linkage later.';
