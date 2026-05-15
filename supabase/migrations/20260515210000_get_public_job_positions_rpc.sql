-- Public Careers: active job_positions for visitors (anon + authenticated) even if direct
-- table RLS or session roles would otherwise hide rows.

CREATE OR REPLACE FUNCTION public.get_public_job_positions()
RETURNS SETOF public.job_positions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.job_positions
  WHERE COALESCE(is_active, true) = true
  ORDER BY is_featured DESC NULLS LAST, created_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_public_job_positions() IS
  'Active careers listings for the public Careers page; bypasses caller RLS.';

REVOKE ALL ON FUNCTION public.get_public_job_positions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_job_positions() TO anon, authenticated;
