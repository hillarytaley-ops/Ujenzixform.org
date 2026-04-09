-- Gate "Staff Access" on /auth: reveal only when typed email matches an active admin_staff row.
-- Note: allows email enumeration of staff addresses; acceptable for low-profile staff list or pair with WAF/rate limits.

CREATE OR REPLACE FUNCTION public.is_admin_staff_portal_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_staff s
    WHERE s.email IS NOT NULL
      AND length(trim(s.email)) > 0
      AND lower(trim(s.email)) = lower(trim(p_email))
      AND COALESCE(s.status, 'active') = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_staff_portal_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) TO anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'Returns true if email matches an active admin_staff row; used to show Staff Access on public auth page only for listed staff.';
