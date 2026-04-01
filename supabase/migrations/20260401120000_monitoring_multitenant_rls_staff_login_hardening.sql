-- =============================================================================
-- Multi-tenant camera + site vision RLS; staff login throttle + hash backfill;
-- monitoring access-code RPC (anon-safe) for assigned cameras only.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1) Who may see a camera row (admin, project owner, optional project_members)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_can_access_camera(p_camera_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_admin_no_rls() THEN
    RETURN true;
  END IF;

  SELECT c.project_id INTO v_project
  FROM public.cameras c
  WHERE c.id = p_camera_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Unassigned cameras: admin only (handled above)
  IF v_project IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = v_project
      AND (
        p.builder_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = p.builder_id
            AND pr.user_id = (SELECT auth.uid())
        )
      )
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_members'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = v_project
        AND pm.user_id = (SELECT auth.uid())
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_can_access_camera(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_can_access_camera(uuid) TO authenticated;

COMMENT ON FUNCTION public.auth_can_access_camera(uuid) IS
  'RLS helper: true if JWT user may view this camera (admin, project owner via builder_id/profile, or project_members).';

-- ---------------------------------------------------------------------------
-- 2) Cameras: drop all policies, reapply strict multi-tenant set
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cameras'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cameras', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "cameras_deny_anon"
ON public.cameras FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "cameras_admin_manage"
ON public.cameras FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

CREATE POLICY "cameras_select_tenant"
ON public.cameras FOR SELECT TO authenticated
USING (public.auth_can_access_camera(id));

REVOKE ALL ON public.cameras FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cameras TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Site vision events: project-scoped SELECT (not all authenticated users)
-- ---------------------------------------------------------------------------
DO $sv$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_vision_events'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "site_vision_events_select_authenticated" ON public.site_vision_events';
    EXECUTE $p$
      CREATE POLICY "site_vision_events_select_scoped"
      ON public.site_vision_events FOR SELECT TO authenticated
      USING (
        public.is_admin_no_rls()
        OR public.auth_can_access_camera(camera_id)
      )
    $p$;
  END IF;
END $sv$;

-- ---------------------------------------------------------------------------
-- 4) Secure camera RPCs: no anon; enforce same rules as RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_camera_stream_secure(camera_uuid uuid)
RETURNS TABLE (
  camera_id uuid,
  stream_url text,
  authorized boolean,
  access_message text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN QUERY SELECT
      camera_uuid, NULL::text, false,
      'Authentication required. Please sign in.'::text,
      NULL::timestamptz;
    RETURN;
  END IF;

  IF NOT public.auth_can_access_camera(camera_uuid) THEN
    RETURN QUERY SELECT
      camera_uuid, NULL::text, false,
      'Access denied. You do not have permission to view this camera.'::text,
      NULL::timestamptz;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.stream_url, true, 'Access granted'::text, now() + interval '2 hours'
  FROM public.cameras c
  WHERE c.id = camera_uuid AND c.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secure_camera_info(camera_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  location text,
  project_id uuid,
  is_active boolean,
  camera_type text,
  can_view_stream boolean,
  general_location text,
  access_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.auth_can_access_camera(camera_uuid) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    c.location,
    c.project_id,
    c.is_active,
    COALESCE(c.camera_type::text, 'ip_camera'),
    true,
    COALESCE(split_part(c.location, ',', -1), 'Construction Site'),
    'Access granted'::text
  FROM public.cameras c
  WHERE c.id = camera_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_camera_directory()
RETURNS TABLE (
  id uuid,
  name text,
  general_location text,
  is_active boolean,
  access_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    COALESCE(split_part(c.location, ',', -1), 'Construction Site'),
    c.is_active,
    CASE WHEN public.auth_can_access_camera(c.id) THEN 'Access granted' ELSE 'hidden' END
  FROM public.cameras c
  WHERE c.is_active = true
    AND public.auth_can_access_camera(c.id)
  ORDER BY c.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_camera_stream_secure(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_secure_camera_info(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_camera_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_camera_stream_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_camera_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_camera_directory() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Monitoring access code → request + cameras (anon + auth; code-validated only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_monitoring_access_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_id uuid;
  r_project_name text;
  r_status text;
  r_access_code text;
  r_assigned uuid[];
  cams jsonb;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT msr.id, msr.project_name, msr.status, msr.access_code, msr.assigned_cameras
  INTO r_id, r_project_name, r_status, r_access_code, r_assigned
  FROM public.monitoring_service_requests msr
  WHERE upper(trim(msr.access_code)) = upper(trim(p_code))
    AND msr.status IN ('approved', 'completed')
  ORDER BY msr.updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF r_assigned IS NULL OR cardinality(r_assigned) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request', jsonb_build_object(
        'id', r_id,
        'project_name', r_project_name,
        'status', r_status,
        'access_code', r_access_code
      ),
      'cameras', '[]'::jsonb
    );
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'location', c.location,
      'is_active', c.is_active,
      'resolution', c.resolution,
      'stream_url', c.stream_url,
      'embed_code', c.embed_code,
      'connection_type', c.connection_type,
      'supports_ptz', c.supports_ptz,
      'supports_two_way_audio', c.supports_two_way_audio
    ) ORDER BY c.name
  ), '[]'::jsonb)
  INTO cams
  FROM public.cameras c
  WHERE c.id = ANY (r_assigned);

  RETURN jsonb_build_object(
    'ok', true,
    'request', jsonb_build_object(
      'id', r_id,
      'project_name', r_project_name,
      'status', r_status,
      'access_code', r_access_code
    ),
    'cameras', cams
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_monitoring_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_monitoring_access_code(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_monitoring_access_code(text) IS
  'Guest / client monitoring: returns approved request summary and only assigned cameras for a valid access code.';

-- ---------------------------------------------------------------------------
-- 6) Staff login rate limit (DB-side; complements client lockout)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_login_throttle (
  email_norm text PRIMARY KEY,
  fail_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_login_throttle ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._staff_login_throttle_check(p_email_norm text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_start timestamptz;
BEGIN
  SELECT fail_count, window_started_at INTO v_count, v_start
  FROM public.staff_login_throttle
  WHERE email_norm = p_email_norm;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF v_start < now() - interval '15 minutes' THEN
    RETURN true;
  END IF;

  RETURN v_count < 10;
END;
$$;

CREATE OR REPLACE FUNCTION public._staff_login_throttle_fail(p_email_norm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_count int;
BEGIN
  SELECT window_started_at, fail_count INTO v_start, v_count
  FROM public.staff_login_throttle
  WHERE email_norm = p_email_norm;

  IF NOT FOUND THEN
    INSERT INTO public.staff_login_throttle (email_norm, fail_count, window_started_at)
    VALUES (p_email_norm, 1, now());
    RETURN;
  END IF;

  IF v_start < now() - interval '15 minutes' THEN
    UPDATE public.staff_login_throttle
    SET fail_count = 1, window_started_at = now()
    WHERE email_norm = p_email_norm;
  ELSE
    UPDATE public.staff_login_throttle
    SET fail_count = fail_count + 1
    WHERE email_norm = p_email_norm;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._staff_login_throttle_clear(p_email_norm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.staff_login_throttle WHERE email_norm = p_email_norm;
END;
$$;

REVOKE ALL ON FUNCTION public._staff_login_throttle_check(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._staff_login_throttle_fail(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._staff_login_throttle_clear(text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 7) Backfill staff_code_hash; verify_admin_staff_login + rate limit
-- ---------------------------------------------------------------------------
UPDATE public.admin_staff s
SET staff_code_hash = encode(
  extensions.digest(convert_to(upper(trim(s.staff_code)), 'UTF8'), 'sha256'),
  'hex'
)
WHERE (s.staff_code_hash IS NULL OR trim(s.staff_code_hash) = '')
  AND s.staff_code IS NOT NULL
  AND trim(s.staff_code) <> '';

COMMENT ON COLUMN public.admin_staff.staff_code IS
  'Legacy plaintext staff code; prefer staff_code_hash for storage. RPC verifies submitted code against hash.';

CREATE OR REPLACE FUNCTION public.verify_admin_staff_login(p_email text, p_staff_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'role', COALESCE(v_role, 'admin'),
    'full_name', v_disp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_staff_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_staff_login(text, text) TO anon, authenticated;
