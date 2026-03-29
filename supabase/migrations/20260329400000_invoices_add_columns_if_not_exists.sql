-- Idempotent column adds (IF NOT EXISTS) so production gets invoice_date even if 20260329390000
-- was skipped or failed. Fixes: column "invoice_date" of relation "invoices" does not exist (42703)
-- when mark_grn_viewed_by_supplier fires auto_create_invoice.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS builder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.invoices
SET invoice_date = COALESCE(invoice_date, (created_at AT TIME ZONE 'UTC')::date, CURRENT_DATE)
WHERE invoice_date IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issuer_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invoices ALTER COLUMN issuer_id DROP NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_grn_purchase_order_id UUID;
  v_grn_builder_id UUID;
  v_grn_supplier_id UUID;
  v_grn_items JSONB;
  v_po_total_amount DECIMAL(12, 2);
  v_subtotal DECIMAL(12, 2);
  v_total DECIMAL(12, 2);
  v_has_invoice_date boolean;
BEGIN
  IF NEW.status = 'viewed_by_supplier' AND (OLD.status IS NULL OR OLD.status != 'viewed_by_supplier') THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_date'
    )
    INTO v_has_invoice_date;

    IF EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.grn_id IS NOT DISTINCT FROM NEW.id
        AND inv.status IS DISTINCT FROM 'cancelled'
    ) THEN
      RETURN NEW;
    END IF;

    v_grn_purchase_order_id := NEW.purchase_order_id;
    v_grn_builder_id := NEW.builder_id;
    v_grn_supplier_id := NEW.supplier_id;
    v_grn_items := NEW.items;

    IF v_grn_builder_id IS NULL OR v_grn_supplier_id IS NULL OR v_grn_purchase_order_id IS NULL THEN
      RAISE NOTICE 'Cannot create invoice: missing required fields in GRN %', NEW.id;
      RETURN NEW;
    END IF;

    SELECT total_amount
    INTO v_po_total_amount
    FROM public.purchase_orders
    WHERE id = v_grn_purchase_order_id;

    IF NOT FOUND THEN
      v_po_total_amount := 0;
    END IF;

    SELECT COALESCE(MAX(CAST(SUBSTRING(inv.invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_invoice_number
    FROM public.invoices inv
    WHERE inv.invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

    v_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_invoice_number::TEXT, 4, '0');

    v_subtotal := COALESCE(v_po_total_amount, 0);
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
        v_grn_purchase_order_id,
        NEW.id,
        v_grn_supplier_id,
        v_grn_builder_id,
        v_grn_items,
        v_subtotal,
        v_total,
        CURRENT_DATE,
        (CURRENT_DATE + INTERVAL '30 days')::date,
        'draft',
        'pending',
        TRUE,
        auth.uid()
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
        v_grn_purchase_order_id,
        NEW.id,
        v_grn_supplier_id,
        v_grn_builder_id,
        v_grn_items,
        v_subtotal,
        v_total,
        (CURRENT_DATE + INTERVAL '30 days')::date,
        'draft',
        'pending',
        TRUE,
        auth.uid()
      );
    END IF;

    RAISE NOTICE 'Auto-created Invoice % for GRN %', v_invoice_number, NEW.grn_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_invoice ON public.goods_received_notes;
CREATE TRIGGER trigger_auto_create_invoice
  AFTER UPDATE OF status ON public.goods_received_notes
  FOR EACH ROW
  WHEN (NEW.status = 'viewed_by_supplier' AND (OLD.status IS NULL OR OLD.status != 'viewed_by_supplier'))
  EXECUTE FUNCTION public.auto_create_invoice();
