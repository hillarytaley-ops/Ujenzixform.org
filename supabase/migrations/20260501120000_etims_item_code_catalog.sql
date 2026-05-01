-- Optional KRA / integrator item code per catalog line (used when building eTIMS invoices from purchase_orders.items).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplier_product_prices' AND column_name = 'etims_item_code'
  ) THEN
    ALTER TABLE public.supplier_product_prices ADD COLUMN etims_item_code TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'etims_item_code'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN etims_item_code TEXT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.supplier_product_prices.etims_item_code IS 'KRA/integrator item code for this supplier product (eTIMS invoice line itemCode).';
COMMENT ON COLUMN public.materials.etims_item_code IS 'KRA/integrator item code for supplier-uploaded catalog rows (eTIMS).';
