-- Builders could see zero monitoring rows when RLS policies conflict, user_id was NULL/wrong,
-- user_id mistakenly held profiles.id, or only requester_id/contact_email matched auth.

-- 1) Repair: user_id was saved as profiles.id instead of auth.users.id
UPDATE public.monitoring_service_requests msr
SET user_id = p.user_id
FROM public.profiles p
WHERE msr.user_id = p.id
  AND p.user_id IS NOT NULL
  AND msr.user_id IS DISTINCT FROM p.user_id;

-- 2) Repair: copy requester_id when column exists and user_id still null
DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitoring_service_requests'
      AND column_name = 'requester_id'
  ) THEN
    UPDATE public.monitoring_service_requests
    SET user_id = requester_id
    WHERE user_id IS NULL AND requester_id IS NOT NULL;
  END IF;
END $migrate$;

-- 3) Repair: email match (same as 60324; idempotent)
UPDATE public.monitoring_service_requests msr
SET user_id = u.id
FROM auth.users u
WHERE msr.user_id IS NULL
  AND msr.contact_email IS NOT NULL
  AND TRIM(msr.contact_email) <> ''
  AND LOWER(TRIM(msr.contact_email)) = LOWER(TRIM(u.email));

-- 4) RPC: return rows the current user should see (bypasses broken RLS for reads)
CREATE OR REPLACE FUNCTION public.get_my_monitoring_service_requests()
RETURNS SETOF public.monitoring_service_requests
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  has_req boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(trim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'monitoring_service_requests'
      AND c.column_name = 'requester_id'
  ) INTO has_req;

  IF has_req THEN
    RETURN QUERY
    SELECT m.*
    FROM public.monitoring_service_requests m
    WHERE m.user_id = v_uid
       OR m.requester_id = v_uid
       OR (
            v_email IS NOT NULL
            AND length(v_email) > 0
            AND m.contact_email IS NOT NULL
            AND length(trim(m.contact_email)) > 0
            AND lower(trim(m.contact_email)) = v_email
          )
       OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = m.user_id AND p.user_id = v_uid
          );
  ELSE
    RETURN QUERY
    SELECT m.*
    FROM public.monitoring_service_requests m
    WHERE m.user_id = v_uid
       OR (
            v_email IS NOT NULL
            AND length(v_email) > 0
            AND m.contact_email IS NOT NULL
            AND length(trim(m.contact_email)) > 0
            AND lower(trim(m.contact_email)) = v_email
          )
       OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = m.user_id AND p.user_id = v_uid
          );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_monitoring_service_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_monitoring_service_requests() TO authenticated;

COMMENT ON FUNCTION public.get_my_monitoring_service_requests() IS
  'Returns monitoring_service_requests for the current user (user_id, requester_id, email, or profile-id mistake). SECURITY DEFINER; filters by auth.uid() / email.';
