-- Repair deployments where get_public_builder_directory failed (profiles.bio missing).
-- Replaces function body to use to_jsonb(p) only.

CREATE OR REPLACE FUNCTION public.get_public_builder_directory()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(row_json ORDER BY sort_key)
      FROM (
        SELECT
          to_jsonb(p) AS row_json,
          lower(
            coalesce(
              nullif(trim(coalesce(p.company_name, '')), ''),
              coalesce(p.full_name, ''),
              ''
            )
          ) AS sort_key
        FROM public.profiles p
        INNER JOIN public.user_roles ur
          ON ur.user_id = p.user_id
         AND ur.role::text = 'professional_builder'
      ) s
    ),
    '[]'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_builder_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_directory() TO anon, authenticated;
