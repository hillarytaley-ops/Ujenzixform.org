-- Allow "on_hold" (and keep existing values) on registration status columns

-- supplier_applications
ALTER TABLE public.supplier_applications DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.supplier_applications DROP CONSTRAINT IF EXISTS supplier_valid_status;
ALTER TABLE public.supplier_applications DROP CONSTRAINT IF EXISTS supplier_applications_status_check;

ALTER TABLE public.supplier_applications
  ADD CONSTRAINT supplier_applications_status_check
  CHECK (
    status = ANY (
      ARRAY['pending', 'approved', 'rejected', 'on_hold', 'suspended', 'active']::text[]
    )
  );

-- builder_registrations
ALTER TABLE public.builder_registrations DROP CONSTRAINT IF EXISTS builder_valid_status;
ALTER TABLE public.builder_registrations DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.builder_registrations DROP CONSTRAINT IF EXISTS builder_registrations_status_check;

ALTER TABLE public.builder_registrations
  ADD CONSTRAINT builder_registrations_status_check
  CHECK (
    status = ANY (
      ARRAY['pending', 'approved', 'rejected', 'on_hold', 'suspended', 'active']::text[]
    )
  );
