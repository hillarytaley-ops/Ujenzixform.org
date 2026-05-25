-- OSCU/VSCU initialization fields + vendor onboarding audit trail for KRA sandbox demo.

ALTER TABLE public.tis_vendor_onboarding
  ADD COLUMN IF NOT EXISTS initialized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS communication_key_ref TEXT,
  ADD COLUMN IF NOT EXISTS init_device_id TEXT,
  ADD COLUMN IF NOT EXISTS init_branch_name TEXT,
  ADD COLUMN IF NOT EXISTS init_response_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_status_changed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.tis_vendor_onboarding.communication_key_ref IS
  'Non-secret reference to communication key (e.g. last 8 chars). Full cmcKey must not be stored.';
COMMENT ON COLUMN public.tis_vendor_onboarding.init_response_snapshot IS
  'Redacted JSON snapshot of last OSCU/VSCU init response (cmcKey masked).';

CREATE TABLE IF NOT EXISTS public.tis_vendor_onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  onboarding_id UUID REFERENCES public.tis_vendor_onboarding(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'status_change', 'oscu_init', 'vscu_init', 'connection_test', 'admin_note', 'checklist_sync'
  )),
  from_status TEXT,
  to_status TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_tis_vendor_onboarding_events_supplier
  ON public.tis_vendor_onboarding_events(supplier_id, created_at DESC);

ALTER TABLE public.tis_vendor_onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read tis_vendor_onboarding_events" ON public.tis_vendor_onboarding_events;
DROP POLICY IF EXISTS "Staff insert tis_vendor_onboarding_events" ON public.tis_vendor_onboarding_events;

CREATE POLICY "Staff read tis_vendor_onboarding_events"
  ON public.tis_vendor_onboarding_events FOR SELECT TO authenticated
  USING (public.is_tis_integrator_staff());

CREATE POLICY "Staff insert tis_vendor_onboarding_events"
  ON public.tis_vendor_onboarding_events FOR INSERT TO authenticated
  WITH CHECK (public.is_tis_integrator_staff());

GRANT SELECT, INSERT ON public.tis_vendor_onboarding_events TO authenticated;
