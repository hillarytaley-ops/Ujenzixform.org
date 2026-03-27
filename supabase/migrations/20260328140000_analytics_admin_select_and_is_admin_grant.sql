-- Let platform admins read all analytics_events (dashboard / exports).
-- Requires public.is_admin() from prior migrations (SECURITY DEFINER).

DROP POLICY IF EXISTS "analytics_events_admin_select" ON public.analytics_events;

CREATE POLICY "analytics_events_admin_select"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.is_admin());

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
