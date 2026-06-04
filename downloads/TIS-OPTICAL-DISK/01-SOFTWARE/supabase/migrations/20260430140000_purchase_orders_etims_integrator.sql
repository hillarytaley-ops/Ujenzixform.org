-- eTIMS / VFD integrator fields on purchase_orders (optional; additive only).
-- App stores last submission payload + URLs from integrator response for audit trail.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'etims_submitted_at'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN etims_submitted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'etims_trader_invoice_no'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN etims_trader_invoice_no TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'etims_response'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN etims_response JSONB NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'etims_verification_url'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN etims_verification_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'etims_error'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN etims_error TEXT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.purchase_orders.etims_response IS 'Last integrator/KRA JSON response from eTIMS invoice submission (Edge etims-proxy).';
COMMENT ON COLUMN public.purchase_orders.etims_trader_invoice_no IS 'Trader invoice number sent to integrator (usually po_number).';
