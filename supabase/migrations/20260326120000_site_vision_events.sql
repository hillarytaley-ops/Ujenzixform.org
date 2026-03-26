-- ============================================================
-- Site vision events (edge / cloud CV worker → Supabase)
-- Inserts: service_role only (worker on laptop, mini PC, or VPS)
-- Reads: authenticated app users (ML analytics, future monitoring)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_vision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC,
  image_ref TEXT,
  source_worker TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_vision_events_event_type_nonempty CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_site_vision_events_camera_time
  ON public.site_vision_events (camera_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_vision_events_project_time
  ON public.site_vision_events (project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_vision_events_occurred
  ON public.site_vision_events (occurred_at DESC);

COMMENT ON TABLE public.site_vision_events IS
  'Computer vision outputs from edge/cloud workers. Written with SUPABASE_SERVICE_ROLE_KEY only; never expose that key in the browser.';

ALTER TABLE public.site_vision_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (aligns with permissive cameras policies; tighten by project later)
DROP POLICY IF EXISTS "site_vision_events_select_authenticated" ON public.site_vision_events;
CREATE POLICY "site_vision_events_select_authenticated"
  ON public.site_vision_events
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE for authenticated — only service_role bypasses RLS for writes

GRANT SELECT ON public.site_vision_events TO authenticated;
