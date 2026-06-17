-- Live eTIMS E2E: default suppliers to one-way sale invoices during pilot testing.
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS etims_submission_mode TEXT DEFAULT 'sale_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suppliers_etims_submission_mode_check'
      AND conrelid = 'public.suppliers'::regclass
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_etims_submission_mode_check
      CHECK (etims_submission_mode IN ('sale_only', 'full'));
  END IF;
END $$;

COMMENT ON COLUMN public.suppliers.etims_submission_mode IS
  'sale_only = E2E pilot (S invoices only); full = allow credit notes via TIS ops.';

UPDATE public.suppliers
SET etims_submission_mode = 'sale_only'
WHERE etims_submission_mode IS NULL;
