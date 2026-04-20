-- Admin User Registrations: persist status for role-only rows when no application row matches by user id.
-- Used by staff dashboard when supplier_applications / builder_registrations are missing or unlinked.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS registration_admin_status TEXT;

COMMENT ON COLUMN public.suppliers.registration_admin_status IS
  'Optional admin-only status for the registrations list (e.g. on_hold) when the user has a supplier profile but no linked supplier_applications row.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_admin_status TEXT;

COMMENT ON COLUMN public.profiles.registration_admin_status IS
  'Optional admin-only status for the registrations list (e.g. on_hold) for builder role-only rows without builder_registrations.';
