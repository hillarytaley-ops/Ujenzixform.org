-- Tighten cameras SELECT: remove world-readable policy and anon SELECT grant.
-- Admins keep full access via existing cameras_admin_manage (FOR ALL).
-- Project builders: projects.builder_id may be auth.users id OR profiles.id (join profiles.user_id).

DROP POLICY IF EXISTS "cameras_view_all" ON public.cameras;

CREATE POLICY "cameras_select_project_owner_or_admin" ON public.cameras
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
  )
  OR (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = cameras.project_id
        AND (
          p.builder_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = p.builder_id
              AND pr.user_id = (SELECT auth.uid())
          )
        )
    )
  )
);

-- Cameras with no project_id are visible only to admins (via cameras_admin_manage SELECT).

REVOKE SELECT ON public.cameras FROM anon;
