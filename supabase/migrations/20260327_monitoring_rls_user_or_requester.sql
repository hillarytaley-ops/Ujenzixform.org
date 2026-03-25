-- Builders: own rows by user_id, and by requester_id only if that legacy column exists.
-- Some deployments never added requester_id — referencing it breaks migration (42703).

DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitoring_service_requests'
      AND column_name = 'requester_id'
  ) THEN
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
  ELSE
    DROP POLICY IF EXISTS "Users can view own monitoring requests" ON public.monitoring_service_requests;
    CREATE POLICY "Users can view own monitoring requests"
    ON public.monitoring_service_requests FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "Users can update own monitoring requests" ON public.monitoring_service_requests;
    CREATE POLICY "Users can update own monitoring requests"
    ON public.monitoring_service_requests FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $migrate$;
