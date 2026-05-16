-- Admin delivery directory: one row per delivery account (matches user_roles), enriched from
-- registration / delivery_providers / profile. Excludes admins and active admin_staff so
-- internal accounts (e.g. hiring/staff) do not appear as "delivery" payees.
-- Replaces 20260516200000_admin_delivery_providers_roles_only.sql behavior.

DROP FUNCTION IF EXISTS public.admin_list_all_delivery_providers();

CREATE FUNCTION public.admin_list_all_delivery_providers()
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
  service_areas text[],
  bank_name text,
  bank_account_holder_name text,
  bank_account_number text,
  bank_branch text
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
    COALESCE(r.id, dp.id, p.id, du.user_id) AS id,
    r.id AS registration_id,
    CASE
      WHEN r.id IS NOT NULL THEN 'registration'::text
      WHEN dp.id IS NOT NULL THEN 'provider'::text
      WHEN p.id IS NOT NULL THEN 'profile'::text
      ELSE 'account'::text
    END AS source,
    COALESCE(
      NULLIF(trim(r.full_name), ''),
      NULLIF(trim(p.full_name), ''),
      NULLIF(split_part(u.email::text, '@', 1), ''),
      'Delivery provider'::text
    ) AS full_name,
    COALESCE(
      NULLIF(trim(r.company_name), ''),
      NULLIF(trim(r.full_name), ''),
      NULLIF(trim(dp.provider_name), ''),
      NULLIF(trim(p.company_name), ''),
      NULLIF(trim(p.full_name), ''),
      NULLIF(split_part(u.email::text, '@', 1), ''),
      'Delivery provider'::text
    ) AS provider_name,
    COALESCE(r.email, dp.email, u.email::text) AS email,
    COALESCE(r.phone, dp.phone, p.phone) AS phone,
    COALESCE(
      r.status,
      CASE
        WHEN dp.id IS NOT NULL THEN CASE WHEN dp.is_verified THEN 'approved'::text ELSE 'pending'::text END
        ELSE 'active'::text
      END
    ) AS status,
    du.user_id AS auth_user_id,
    COALESCE(r.created_at, dp.created_at, p.created_at) AS created_at,
    r.county,
    COALESCE(r.physical_address, dp.address) AS address,
    COALESCE(r.vehicle_type, (dp.vehicle_types)[1]::text) AS vehicle_type,
    COALESCE(r.service_areas, dp.service_areas) AS service_areas,
    r.bank_name,
    COALESCE(r.bank_account_holder_name, dp.bank_account_holder_name) AS bank_account_holder_name,
    COALESCE(r.bank_account_number, dp.bank_account_number) AS bank_account_number,
    COALESCE(r.bank_branch, dp.bank_branch) AS bank_branch
  FROM (
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role::text IN ('delivery_provider', 'delivery')
      AND NOT EXISTS (
        SELECT 1 FROM user_roles x
        WHERE x.user_id = ur.user_id AND x.role = 'admin'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.admin_staff s
        WHERE s.user_id = ur.user_id
          AND COALESCE(s.is_active, true)
      )
  ) du
  LEFT JOIN LATERAL (
    SELECT r.*
    FROM delivery_provider_registrations r
    WHERE r.auth_user_id = du.user_id
    ORDER BY r.reviewed_at DESC NULLS LAST, r.created_at DESC
    LIMIT 1
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT dp.*
    FROM delivery_providers dp
    WHERE dp.user_id = du.user_id
    ORDER BY dp.created_at DESC
    LIMIT 1
  ) dp ON true
  LEFT JOIN profiles p ON p.user_id = du.user_id
  LEFT JOIN auth.users u ON u.id = du.user_id
  ORDER BY COALESCE(r.full_name, p.full_name, u.email::text) ASC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.admin_list_all_delivery_providers() IS
  'Admin only: one row per user with delivery role; enriched from registration, delivery_providers, profile; excludes admin role and active admin_staff.';

GRANT EXECUTE ON FUNCTION public.admin_list_all_delivery_providers() TO authenticated;
