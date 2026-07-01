-- Run in Supabase SQL Editor — restores delivery dashboard for existing providers
-- (Fixes hiring RPC order + reactivates verified rows deactivated by the hiring gate migration)

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
