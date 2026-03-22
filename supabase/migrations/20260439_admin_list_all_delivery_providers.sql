-- ============================================================
-- Admin RPC: List ALL delivery providers from both tables.
-- Bypasses RLS so admin sees everyone (registrations + providers).
-- Use for admin dashboard "Delivery Apps" and registrations list.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_all_delivery_providers()
RETURNS TABLE(
  id uuid,
  registration_id uuid,
  source text,
  full_name text,
  provider_name text,
  email text,
  phone text,
  status text,
  auth_user_id uuid,
  created_at timestamptz,
  county text,
  address text,
  vehicle_type text,
  service_areas text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.id AS registration_id,
    'registration'::text,
    r.full_name,
    COALESCE(NULLIF(trim(r.company_name), ''), r.full_name),
    r.email,
    r.phone,
    r.status,
    r.auth_user_id,
    r.created_at,
    r.county,
    r.physical_address AS address,
    r.vehicle_type,
    r.service_areas
  FROM delivery_provider_registrations r
  ORDER BY r.created_at DESC;

  RETURN QUERY
  SELECT
    dp.id,
    NULL::uuid AS registration_id,
    'provider'::text,
    p.full_name,
    dp.provider_name,
    dp.email,
    dp.phone,
    CASE WHEN dp.is_verified THEN 'approved'::text ELSE 'pending'::text END,
    dp.user_id,
    dp.created_at,
    NULL::text,
    dp.address,
    (dp.vehicle_types)[1]::text,
    dp.service_areas
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM delivery_provider_registrations r
    WHERE r.auth_user_id = dp.user_id
  )
  ORDER BY dp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_all_delivery_providers() IS
  'Admin only: returns all delivery providers from registrations + providers table (providers with no registration). Bypasses RLS.';

GRANT EXECUTE ON FUNCTION public.admin_list_all_delivery_providers() TO authenticated;
