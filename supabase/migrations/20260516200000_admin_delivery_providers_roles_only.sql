-- Payslip / admin directory: list only accounts with delivery role (matches dashboard "Delivery" count).
-- Previously all delivery_provider_registrations and delivery_providers rows were returned,
-- including applicants without a delivery role and any mis-linked rows.

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
    r.service_areas,
    r.bank_name,
    r.bank_account_holder_name,
    r.bank_account_number,
    r.bank_branch
  FROM delivery_provider_registrations r
  WHERE r.auth_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = r.auth_user_id
        AND ur.role::text IN ('delivery_provider', 'delivery')
    )
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
    dp.service_areas,
    dp.bank_name,
    dp.bank_account_holder_name,
    dp.bank_account_number,
    dp.bank_branch
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = dp.user_id
        AND ur.role::text IN ('delivery_provider', 'delivery')
    )
    AND NOT EXISTS (
      SELECT 1 FROM delivery_provider_registrations r
      WHERE r.auth_user_id = dp.user_id
    )
  ORDER BY dp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_all_delivery_providers() IS
  'Admin only: delivery providers that have delivery_provider (or legacy delivery) role in user_roles — registrations + providers table, including payout bank fields.';

GRANT EXECUTE ON FUNCTION public.admin_list_all_delivery_providers() TO authenticated;
