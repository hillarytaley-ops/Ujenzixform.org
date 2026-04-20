-- Idempotent: ensure registration_admin_status exists on suppliers and profiles.
-- If 20260418160000 was skipped on a database, PostgREST returns "column ... not in schema cache".

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS registration_admin_status TEXT;

COMMENT ON COLUMN public.suppliers.registration_admin_status IS
  'Optional admin-only status for the registrations list (e.g. on_hold) when the user has a supplier profile but no linked supplier_applications row.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_admin_status TEXT;

COMMENT ON COLUMN public.profiles.registration_admin_status IS
  'Optional admin-only status for the registrations list (e.g. on_hold) for role-only rows without linked registration tables.';
