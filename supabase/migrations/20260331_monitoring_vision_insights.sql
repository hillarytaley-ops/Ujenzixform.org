-- Live AI / CV events from Monitoring camera streams → ML Analytics + builder dashboards (Realtime).
-- Ingest: Edge Function or external vision worker using service_role INSERT with correct user_id
-- (monitoring request owner). Client reads via RLS; Realtime pushes new rows.

CREATE TABLE IF NOT EXISTS public.monitoring_vision_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  monitoring_request_id UUID REFERENCES public.monitoring_service_requests (id) ON DELETE SET NULL,
  project_id UUID,
  camera_id UUID,
  camera_label TEXT,
  insight_category TEXT NOT NULL DEFAULT 'other'
    CHECK (insight_category IN ('security', 'workforce', 'operations', 'safety', 'usage', 'other')),
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  headline TEXT NOT NULL,
  detail TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  source_stream_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_vision_insights_user_created
  ON public.monitoring_vision_insights (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_vision_insights_project_created
  ON public.monitoring_vision_insights (project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.monitoring_vision_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitoring_vision_insights_select_own" ON public.monitoring_vision_insights;
CREATE POLICY "monitoring_vision_insights_select_own"
  ON public.monitoring_vision_insights
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "monitoring_vision_insights_select_admin" ON public.monitoring_vision_insights;
CREATE POLICY "monitoring_vision_insights_select_admin"
  ON public.monitoring_vision_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT ON public.monitoring_vision_insights TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'monitoring_vision_insights'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_vision_insights;
  END IF;
END $$;

ALTER TABLE public.monitoring_vision_insights REPLICA IDENTITY FULL;

COMMENT ON TABLE public.monitoring_vision_insights IS
  'Camera/vision pipeline events for builders and admins; subscribe via Realtime on INSERT.';
