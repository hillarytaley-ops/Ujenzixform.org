-- =============================================================================
-- Link admin_staff rows to auth.users + platform roles (production admin JWT)
-- Run after staff emails exist in auth.users (password = staff code or reset).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.link_admin_staff_auth_user(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email_norm text;
  v_uid uuid;
  v_staff_id uuid;
  v_staff_role text;
  v_platform_role text;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_required');
  END IF;

  v_email_norm := lower(trim(p_email));

  IF auth.uid() IS NOT NULL AND NOT public.is_admin_no_rls() THEN
    IF lower(trim((SELECT email FROM auth.users WHERE id = auth.uid()))) IS DISTINCT FROM v_email_norm THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  END IF;

  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(trim(email)) = v_email_norm
  LIMIT 1;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_user_not_found', 'email', v_email_norm);
  END IF;

  SELECT s.id, s.role::text
  INTO v_staff_id, v_staff_role
  FROM public.admin_staff s
  WHERE lower(trim(s.email)) = v_email_norm
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_staff_not_found', 'email', v_email_norm);
  END IF;

  UPDATE public.admin_staff
  SET user_id = v_uid, updated_at = now()
  WHERE id = v_staff_id
    AND (user_id IS DISTINCT FROM v_uid);

  v_platform_role := CASE
    WHEN v_staff_role IN ('super_admin', 'superadmin') THEN 'super_admin'
    WHEN v_staff_role IN ('admin', 'administrator') THEN 'admin'
    ELSE 'admin'
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_platform_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_platform_role);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email_norm,
    'user_id', v_uid,
    'staff_id', v_staff_id,
    'platform_role', v_platform_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_admin_staff_auth_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_admin_staff_auth_user(text) TO authenticated;

COMMENT ON FUNCTION public.link_admin_staff_auth_user(text) IS
  'Links admin_staff.user_id to auth.users by email and ensures user_roles admin row. Caller must be platform admin.';

CREATE OR REPLACE FUNCTION public.link_all_admin_staff_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  r record;
  v_linked int := 0;
  v_missing int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin_no_rls() THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  FOR r IN
    SELECT lower(trim(s.email)) AS em
    FROM public.admin_staff s
    WHERE s.email IS NOT NULL AND trim(s.email) <> ''
      AND COALESCE(s.status, 'active') = 'active'
  LOOP
    DECLARE v_res jsonb;
    BEGIN
      v_res := public.link_admin_staff_auth_user(r.em);
      IF (v_res->>'ok')::boolean THEN
        v_linked := v_linked + 1;
      ELSE
        v_missing := v_missing + 1;
      END IF;
      v_results := v_results || jsonb_build_array(v_res);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'linked', v_linked,
    'missing_auth_user', v_missing,
    'details', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_all_admin_staff_auth_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_all_admin_staff_auth_users() TO authenticated;

-- Auto-link on successful staff login (when auth.users row exists)
CREATE OR REPLACE FUNCTION public.verify_admin_staff_login(p_email text, p_staff_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid;
  v_role text;
  v_disp text;
  v_staff_code text;
  v_staff_code_hash text;
  v_status text;
  v_hash text;
  v_email_norm text;
  v_uid uuid;
  v_result jsonb;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0
     OR p_staff_code IS NULL OR length(trim(p_staff_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_email_norm := lower(trim(p_email));

  IF NOT public._staff_login_throttle_check(v_email_norm) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  v_hash := encode(
    extensions.digest(convert_to(upper(trim(p_staff_code)), 'UTF8'), 'sha256'),
    'hex'
  );

  SELECT
    s.id,
    s.role::text,
    COALESCE(NULLIF(TRIM(s.full_name), ''), 'Staff Member'),
    s.staff_code,
    s.staff_code_hash,
    s.status
  INTO v_id, v_role, v_disp, v_staff_code, v_staff_code_hash, v_status
  FROM public.admin_staff s
  WHERE lower(trim(s.email)) = v_email_norm
  LIMIT 1;

  IF v_id IS NULL THEN
    PERFORM public._staff_login_throttle_fail(v_email_norm);
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF COALESCE(v_status, 'active') IS DISTINCT FROM 'active' THEN
    PERFORM public._staff_login_throttle_fail(v_email_norm);
    RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
  END IF;

  IF COALESCE(NULLIF(TRIM(v_staff_code_hash), ''), '') <> '' THEN
    IF lower(trim(v_staff_code_hash)) IS DISTINCT FROM lower(v_hash) THEN
      IF COALESCE(NULLIF(TRIM(v_staff_code), ''), '') = ''
         OR upper(trim(v_staff_code)) IS DISTINCT FROM upper(trim(p_staff_code)) THEN
        PERFORM public._staff_login_throttle_fail(v_email_norm);
        RETURN jsonb_build_object('ok', false);
      END IF;
    END IF;
  ELSIF COALESCE(NULLIF(TRIM(v_staff_code), ''), '') <> '' THEN
    IF upper(trim(v_staff_code)) IS DISTINCT FROM upper(trim(p_staff_code)) THEN
      PERFORM public._staff_login_throttle_fail(v_email_norm);
      RETURN jsonb_build_object('ok', false);
    END IF;
  ELSE
    PERFORM public._staff_login_throttle_fail(v_email_norm);
    RETURN jsonb_build_object('ok', false);
  END IF;

  PERFORM public._staff_login_throttle_clear(v_email_norm);
  UPDATE public.admin_staff SET last_login = now() WHERE id = v_id;

  SELECT id INTO v_uid FROM auth.users WHERE lower(trim(email)) = v_email_norm LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.admin_staff SET user_id = v_uid WHERE id = v_id AND user_id IS DISTINCT FROM v_uid;
    PERFORM public.link_admin_staff_auth_user(v_email_norm);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'role', COALESCE(v_role, 'admin'),
    'full_name', v_disp,
    'auth_user_id', v_uid,
    'has_auth_user', v_uid IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_staff_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_staff_login(text, text) TO anon, authenticated;

-- Backfill existing active staff where auth.users already exists
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT lower(trim(s.email)) AS em
    FROM public.admin_staff s
    WHERE s.email IS NOT NULL AND trim(s.email) <> ''
      AND COALESCE(s.status, 'active') = 'active'
      AND s.user_id IS NULL
  LOOP
    PERFORM public.link_admin_staff_auth_user(r.em);
  END LOOP;
END $$;
