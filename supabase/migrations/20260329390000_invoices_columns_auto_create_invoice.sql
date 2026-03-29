-- Legacy public.invoices (e.g. 20250828) lacks columns that auto_create_invoice() inserts
-- (20260305). The DO block in 20260305 only added grn_id / is_editable / ack columns — not
-- invoice_date, payment_status, or created_by — so "Mark viewed" fails with 42703.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_date'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN invoice_date DATE DEFAULT (CURRENT_DATE);
      UPDATE public.invoices SET invoice_date = (created_at AT TIME ZONE 'UTC')::date
      WHERE invoice_date IS NULL AND created_at IS NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'payment_status'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.invoices
        ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_editable'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN is_editable BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'grn_id'
    ) THEN
      ALTER TABLE public.invoices
        ADD COLUMN grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'discount_amount'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN discount_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'builder_id'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN builder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Legacy invoices (issuer_id = profiles.id) required issuer_id; GRN auto-invoice only sets builder_id.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issuer_id' AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.invoices ALTER COLUMN issuer_id DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure trigger function still exists after any prior CASCADE; align with current table.
CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_grn_id UUID;
  v_grn_purchase_order_id UUID;
  v_grn_builder_id UUID;
  v_grn_supplier_id UUID;
  v_grn_items JSONB;
  v_po_total_amount DECIMAL(12, 2);
  v_subtotal DECIMAL(12, 2);
  v_total DECIMAL(12, 2);
BEGIN
  IF NEW.status = 'viewed_by_supplier' AND (OLD.status IS NULL OR OLD.status != 'viewed_by_supplier') THEN
    IF EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.grn_id = NEW.id
        AND inv.status IS DISTINCT FROM 'cancelled'
    ) THEN
      RETURN NEW;
    END IF;

    v_grn_id := NEW.id;
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
