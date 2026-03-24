-- Fix monitoring_service_requests where user_id was NULL or wrong (legacy INSERT policy
-- only required auth.uid() IS NOT NULL). Builders could not SELECT their rows under RLS.

-- 1) On INSERT from an authenticated user, always set user_id = auth.uid() so RLS matches.
CREATE OR REPLACE FUNCTION public.monitoring_service_requests_set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monitoring_service_requests_set_user_id ON public.monitoring_service_requests;
CREATE TRIGGER trg_monitoring_service_requests_set_user_id
  BEFORE INSERT ON public.monitoring_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.monitoring_service_requests_set_user_id();

-- 2) Backfill user_id for existing rows where contact_email matches a single auth user.
UPDATE public.monitoring_service_requests msr
SET user_id = u.id
FROM auth.users u
WHERE msr.user_id IS NULL
  AND msr.contact_email IS NOT NULL
  AND TRIM(msr.contact_email) <> ''
  AND LOWER(TRIM(msr.contact_email)) = LOWER(TRIM(u.email));

COMMENT ON FUNCTION public.monitoring_service_requests_set_user_id() IS
  'Ensures monitoring_service_requests.user_id matches the authenticated submitter so builder RLS SELECT works.';
