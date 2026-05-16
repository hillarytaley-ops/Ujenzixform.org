-- ============================================================
-- Hiring Manager approval required before accepting deliveries
-- Pending/rejected providers cannot pick delivery orders.
-- ============================================================

-- Resolve auth.users id from provider_id (may be user_id or delivery_providers.id)
CREATE OR REPLACE FUNCTION public.delivery_provider_auth_user_id(p_provider_ref uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT dp.user_id FROM public.delivery_providers dp WHERE dp.id = p_provider_ref LIMIT 1),
    p_provider_ref
  );
$$;

COMMENT ON FUNCTION public.delivery_provider_auth_user_id(uuid) IS
  'Maps delivery_requests.provider_id to auth user id (user_id or delivery_providers.id).';

-- True when Hiring Manager approved (registration) or legacy verified provider row
CREATE OR REPLACE FUNCTION public.is_delivery_provider_hiring_approved(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_provider_registrations r
      WHERE r.auth_user_id = p_user_id
        AND r.status = 'approved'
    ) THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_provider_registrations r
      WHERE r.auth_user_id = p_user_id
    ) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.delivery_providers dp
      WHERE dp.user_id = p_user_id
        AND dp.is_verified = true
        AND dp.is_active = true
    )
  END;
$$;

COMMENT ON FUNCTION public.is_delivery_provider_hiring_approved(uuid) IS
  'Hiring gate: approved registration, or legacy verified+active provider without registration row.';

GRANT EXECUTE ON FUNCTION public.delivery_provider_auth_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_delivery_provider_hiring_approved(uuid) TO authenticated;

-- Block accept/assign unless hiring-approved
CREATE OR REPLACE FUNCTION public.enforce_delivery_provider_hiring_approval_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_assigning boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_assigning := (
    (NEW.status IN ('accepted', 'assigned') AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.provider_id IS DISTINCT FROM NEW.provider_id))
    OR (NEW.provider_id IS NOT NULL AND OLD.provider_id IS DISTINCT FROM NEW.provider_id)
  );

  IF v_assigning AND NEW.provider_id IS NOT NULL THEN
    v_user_id := public.delivery_provider_auth_user_id(NEW.provider_id);
    IF NOT public.is_delivery_provider_hiring_approved(v_user_id) THEN
      RAISE EXCEPTION 'Your delivery provider application must be approved by Hiring Manager before you can accept orders.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_delivery_provider_hiring_approval ON public.delivery_requests;
CREATE TRIGGER trg_enforce_delivery_provider_hiring_approval
  BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delivery_provider_hiring_approval_on_accept();

-- Deactivate provider row when registration is not approved
CREATE OR REPLACE FUNCTION public.sync_provider_active_on_registration_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('pending', 'rejected', 'under_review') THEN
    UPDATE public.delivery_providers
    SET is_active = false, is_verified = false, updated_at = now()
    WHERE user_id = NEW.auth_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_provider_active_on_registration_status ON public.delivery_provider_registrations;
CREATE TRIGGER trg_sync_provider_active_on_registration_status
  AFTER INSERT OR UPDATE OF status ON public.delivery_provider_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_provider_active_on_registration_status();

-- RLS: only hiring-approved providers see open jobs (first-come-first-served pool)
DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  (
    status IN ('pending', 'requested', 'assigned', 'quoted', 'quote_accepted', 'delivery_quote_paid')
    AND public.is_delivery_provider_hiring_approved(auth.uid())
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "delivery_requests_provider_update" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_update" ON public.delivery_requests
FOR UPDATE TO authenticated
USING (
  (
    status IN ('pending', 'requested', 'assigned', 'quoted', 'quote_accepted', 'delivery_quote_paid')
    AND public.is_delivery_provider_hiring_approved(auth.uid())
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.is_delivery_provider_hiring_approved(auth.uid())
    OR builder_id = auth.uid()
    OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
    OR provider_id = auth.uid()
  )
);

-- Existing pending applicants: deactivate provider row until Hiring Manager approves
UPDATE public.delivery_providers dp
SET is_active = false, is_verified = false, updated_at = now()
FROM public.delivery_provider_registrations r
WHERE r.auth_user_id = dp.user_id
  AND r.status IN ('pending', 'rejected', 'under_review');
