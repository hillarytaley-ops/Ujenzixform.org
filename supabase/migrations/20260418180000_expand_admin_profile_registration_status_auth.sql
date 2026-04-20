-- Broaden who may call admin_set_profile_registration_status:
-- - Staff often use registrations_officer / logistics_officer in user_roles, not only admin.
-- - Active admin_staff rows may authorize by email match when JWT exists (same idea as admin_get_all_users_with_roles).

CREATE OR REPLACE FUNCTION public.admin_set_profile_registration_status(
  p_target_user_id uuid,
  p_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  caller uuid;
  caller_email text;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not authorized: missing session' USING ERRCODE = '42501';
  END IF;

  SELECT lower(trim(u.email)) INTO caller_email
  FROM auth.users u
  WHERE u.id = caller;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = caller
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
          s.user_id = caller
          OR (
            caller_email IS NOT NULL
            AND lower(trim(s.email)) = caller_email
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
