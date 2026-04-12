/*
  Align monitoring request statuses with Monitoring.tsx / builder UX:
  - auth_can_access_camera: include in_progress (was missing vs UI filter)
  - resolve_monitoring_access_code: allow active + in_progress so access codes work before "completed"
*/

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

  IF EXISTS (
    SELECT 1
    FROM public.monitoring_service_requests msr
    WHERE msr.assigned_cameras IS NOT NULL
      AND cardinality(msr.assigned_cameras) > 0
      AND p_camera_id = ANY (msr.assigned_cameras)
      AND msr.status IN ('approved', 'completed', 'active', 'in_progress')
      AND msr.user_id IS NOT NULL
      AND msr.user_id = (SELECT auth.uid())
  ) THEN
    RETURN true;
  END IF;

  SELECT c.project_id INTO v_project
  FROM public.cameras c
  WHERE c.id = p_camera_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

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
    AND msr.status IN ('approved', 'completed', 'active', 'in_progress')
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

COMMENT ON FUNCTION public.auth_can_access_camera(uuid) IS
  'RLS helper: admin; monitoring assignment (approved/active/completed/in_progress); project owner; project_members.';
