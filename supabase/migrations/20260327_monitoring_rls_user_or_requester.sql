-- Builders must SELECT (and UPDATE own) rows whether keyed by user_id or legacy requester_id.
-- Admin updates were invisible when user_id stayed NULL but requester_id matched auth.uid().

DROP POLICY IF EXISTS "Users can view own monitoring requests" ON public.monitoring_service_requests;
CREATE POLICY "Users can view own monitoring requests"
ON public.monitoring_service_requests FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR requester_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can update own monitoring requests" ON public.monitoring_service_requests;
CREATE POLICY "Users can update own monitoring requests"
ON public.monitoring_service_requests FOR UPDATE TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR requester_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
    OR requester_id = (SELECT auth.uid())
);

COMMENT ON POLICY "Users can view own monitoring requests" ON public.monitoring_service_requests IS
  'Builder sees rows where user_id or requester_id is their auth uid (sync with admin updates).';
