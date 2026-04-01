-- Allow builders to access cameras assigned to their monitoring request even when
-- cameras.project_id is NULL (admin add-camera flow did not set project_id).
-- Without this, RLS + get_camera_stream_secure deny access while resolve_monitoring_access_code
-- still lists the camera — confusing "assigned but offline / no feed" behaviour.

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

  -- Approved monitoring assignment (same user who submitted the request)
  IF EXISTS (
    SELECT 1
    FROM public.monitoring_service_requests msr
    WHERE msr.assigned_cameras IS NOT NULL
      AND cardinality(msr.assigned_cameras) > 0
      AND p_camera_id = ANY (msr.assigned_cameras)
      AND msr.status IN ('approved', 'completed', 'active')
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

COMMENT ON FUNCTION public.auth_can_access_camera(uuid) IS
  'RLS helper: admin; or camera assigned on builder''s approved monitoring request; or project owner / project_members.';
