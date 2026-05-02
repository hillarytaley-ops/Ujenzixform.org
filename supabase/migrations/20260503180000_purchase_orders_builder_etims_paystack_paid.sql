-- Builder Paystack sandbox (eTIMS-only PO) success: surfaced on builder Invoices Paid tab + supplier order list.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'builder_etims_paystack_paid_at'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN builder_etims_paystack_paid_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'builder_etims_paystack_reference'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN builder_etims_paystack_reference TEXT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.purchase_orders.builder_etims_paystack_paid_at IS 'When set, builder completed Paystack checkout for order_id etims_po_<uuid> (eTIMS receipt sandbox / test flow without supplier invoice).';
COMMENT ON COLUMN public.purchase_orders.builder_etims_paystack_reference IS 'Paystack transaction reference for builder_etims_paystack_paid_at.';
