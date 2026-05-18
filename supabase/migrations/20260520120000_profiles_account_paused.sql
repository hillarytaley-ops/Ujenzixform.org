-- Admin pause: temporarily block dashboard access without deleting the account.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.is_paused IS
  'When true, user cannot access role dashboards; set by staff via admin_set_user_paused.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_paused ON public.profiles (is_paused) WHERE is_paused = true;

-- Staff may pause / unpause accounts (same authorization as registration status RPC).
CREATE OR REPLACE FUNCTION public.admin_set_user_paused(
  p_target_user_id uuid,
  p_paused boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
<<pause_fn>>
DECLARE
  n integer;
  v_caller uuid;
  v_caller_email text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized: missing session' USING ERRCODE = '42501';
  END IF;

  IF pause_fn.v_caller = p_target_user_id THEN
    RAISE EXCEPTION 'cannot pause your own account' USING ERRCODE = '42501';
  END IF;

  SELECT lower(trim(u.email)) INTO v_caller_email
  FROM auth.users u
  WHERE u.id = pause_fn.v_caller;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = pause_fn.v_caller
        AND ur.role::text IN (
          'admin',
          'super_admin',
          'registrations_officer',
          'logistics_officer',
          'finance_officer',
          'monitoring_officer',
          'customer_support',
          'moderator',
          'it_helpdesk'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_staff s
      WHERE coalesce(s.status, 'active') = 'active'
        AND (
          s.user_id = pause_fn.v_caller
          OR (
            pause_fn.v_caller_email IS NOT NULL
            AND lower(trim(s.email)) = pause_fn.v_caller_email
          )
        )
    )
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    is_paused = coalesce(p_paused, false),
    paused_at = CASE WHEN coalesce(p_paused, false) THEN now() ELSE NULL END,
    paused_by = CASE WHEN coalesce(p_paused, false) THEN pause_fn.v_caller ELSE NULL END,
    updated_at = now()
  WHERE user_id = p_target_user_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_paused(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_paused(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_set_user_paused(uuid, boolean) IS
  'Staff: pause or resume a user account (profiles.is_paused). Caller cannot pause self.';

-- Signed-in users may read their own pause flag (for route guards).
DROP POLICY IF EXISTS "profiles_select_own_pause_flag" ON public.profiles;
CREATE POLICY "profiles_select_own_pause_flag"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Exclude paused suppliers from public marketing feed.
CREATE OR REPLACE FUNCTION public.get_public_supplier_feed_posts(p_limit int DEFAULT 10, p_offset int DEFAULT 0)
RETURNS SETOF public.supplier_marketing_posts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.supplier_marketing_posts p
  WHERE COALESCE(NULLIF(trim(p.status), ''), 'active') = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = p.supplier_user_id
        AND COALESCE(pr.is_paused, false) = true
    )
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
