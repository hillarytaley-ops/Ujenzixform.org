-- ============================================================
-- Backfill: Create delivery_providers rows for all approved
-- delivery_provider_registrations that don't have a matching row.
-- Fixes providers who were approved before migration 20260436.
-- ============================================================

INSERT INTO public.delivery_providers (
  user_id,
  provider_name,
  provider_type,
  phone,
  email,
  address,
  contact_person,
  vehicle_types,
  service_areas,
  driving_license_number,
  is_verified,
  is_active,
  updated_at
)
SELECT
  r.auth_user_id AS user_id,
  COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name), 'Delivery Provider') AS provider_name,
  CASE WHEN r.is_company THEN 'company' ELSE 'individual' END AS provider_type,
  COALESCE(NULLIF(trim(r.phone), ''), '0000000000') AS phone,
  NULLIF(trim(r.email), '') AS email,
  COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')) AS address,
  CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END AS contact_person,
  CASE
    WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
    ELSE ARRAY['motorcycle']::text[]
  END AS vehicle_types,
  COALESCE(r.service_areas, ARRAY[]::text[]) AS service_areas,
  NULLIF(trim(r.driving_license_number), '') AS driving_license_number,
  true AS is_verified,
  true AS is_active,
  now() AS updated_at
FROM public.delivery_provider_registrations r
WHERE r.status = 'approved'
  AND r.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.delivery_providers dp
    WHERE dp.user_id = r.auth_user_id
  );

-- Also sync profiles for these users
UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(trim(r.company_name), ''),
    trim(r.full_name),
    p.full_name
  ),
  phone = COALESCE(
    NULLIF(trim(r.phone), ''),
    p.phone
  ),
  updated_at = now()
FROM public.delivery_provider_registrations r
WHERE r.status = 'approved'
  AND r.auth_user_id = p.user_id
  AND (
    p.full_name IS NULL OR p.full_name = '' OR
    p.phone IS NULL OR p.phone = ''
  );

COMMENT ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) IS
  'Admin: set registration status; on approved, upsert delivery_providers + sync profiles. Run 20260437_backfill for existing approved registrations.';
