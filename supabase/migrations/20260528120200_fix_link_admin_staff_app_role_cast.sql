-- Hotfix: link_admin_staff_auth_user must cast to app_role (not text / super_admin)
-- Safe to re-run if 20260528120100 partially applied.

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
  v_app_role public.app_role;
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

  v_app_role := 'admin'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_app_role);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email_norm,
    'user_id', v_uid,
    'staff_id', v_staff_id,
    'platform_role', v_app_role::text,
    'staff_role', v_staff_role
  );
END;
$$;

-- Re-run backfill for staff not yet linked
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
