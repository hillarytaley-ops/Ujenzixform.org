-- Restore delivery dashboard access for existing providers.
-- Problem: is_delivery_provider_hiring_approved blocked ANY registration row (even pending)
-- before checking delivery_providers.is_verified; a trigger also deactivated verified rows.

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
        AND lower(trim(coalesce(r.status, ''))) = 'approved'
    ) THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_providers dp
      WHERE dp.user_id = p_user_id
        AND coalesce(dp.is_verified, false) = true
        AND coalesce(dp.is_active, false) = true
    ) THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_provider_registrations r
      WHERE r.auth_user_id = p_user_id
        AND lower(trim(coalesce(r.status, ''))) IN ('rejected')
    ) THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_provider_registrations r
      WHERE r.auth_user_id = p_user_id
        AND lower(trim(coalesce(r.status, ''))) IN ('pending', 'under_review')
    ) THEN false
    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_delivery_provider_hiring_approved(uuid) IS
  'Hiring gate: approved registration OR verified+active delivery_providers row; pending/rejected registration blocks new applicants.';

-- Do not wipe verified status on pending registration — only reject deactivates
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

  IF lower(trim(coalesce(NEW.status, ''))) = 'rejected' THEN
    UPDATE public.delivery_providers
    SET is_active = false, is_verified = false, updated_at = now()
    WHERE user_id = NEW.auth_user_id;
  ELSIF lower(trim(coalesce(NEW.status, ''))) = 'approved' THEN
    UPDATE public.delivery_providers
    SET is_active = true, is_verified = true, updated_at = now()
    WHERE user_id = NEW.auth_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Grandfather existing delivery-role accounts (one-time restore after over-aggressive gate)
UPDATE public.delivery_provider_registrations r
SET status = 'approved', updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = r.auth_user_id
  AND ur.role IN ('delivery', 'delivery_provider')
  AND lower(trim(coalesce(r.status, ''))) IN ('pending', 'under_review');

UPDATE public.delivery_providers dp
SET is_verified = true, is_active = true, updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = dp.user_id
  AND ur.role IN ('delivery', 'delivery_provider')
  AND (coalesce(dp.is_verified, false) = false OR coalesce(dp.is_active, false) = false);
