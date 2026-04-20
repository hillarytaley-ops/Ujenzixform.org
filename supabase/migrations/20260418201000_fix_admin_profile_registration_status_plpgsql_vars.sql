-- PL/pgSQL: unqualified "caller_email" inside EXISTS(...) can be parsed as a relation (42P01).
-- Qualify locals with a block label so SQL subqueries bind to variables, not missing tables.

CREATE OR REPLACE FUNCTION public.admin_set_profile_registration_status(
  p_target_user_id uuid,
  p_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
<<reg_admin_status_fn>>
DECLARE
  n integer;
  v_caller uuid;
  v_caller_email text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized: missing session' USING ERRCODE = '42501';
  END IF;

  SELECT lower(trim(u.email)) INTO v_caller_email
  FROM auth.users u
  WHERE u.id = reg_admin_status_fn.v_caller;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = reg_admin_status_fn.v_caller
        AND ur.role::text IN (
          'admin',
          'super_admin',
          'registrations_officer',
          'logistics_officer',
          'finance_officer',
          'monitoring_officer',
          'customer_support',
          'moderator',
          'it_helpdesk'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_staff s
      WHERE coalesce(s.status, 'active') = 'active'
        AND (
          s.user_id = reg_admin_status_fn.v_caller
          OR (
            reg_admin_status_fn.v_caller_email IS NOT NULL
            AND lower(trim(s.email)) = reg_admin_status_fn.v_caller_email
          )
        )
    )
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    registration_admin_status = p_status,
    updated_at = now()
  WHERE user_id = p_target_user_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_registration_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_registration_status(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.admin_set_profile_registration_status(uuid, text) IS
  'Admin dashboard: set profiles.registration_admin_status for a target user. Caller must be staff (user_roles or active admin_staff).';
