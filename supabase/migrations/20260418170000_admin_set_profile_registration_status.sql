-- Staff User Registrations: allow admins to set profiles.registration_admin_status for other users.
-- Direct client updates are blocked by RLS ("profiles_self_access" owner-only UPDATE).

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
      AND role::text IN ('admin', 'super_admin')
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
  'Admin dashboard: set profiles.registration_admin_status (e.g. on_hold) for a target user. Caller must have user_roles.role = admin.';
