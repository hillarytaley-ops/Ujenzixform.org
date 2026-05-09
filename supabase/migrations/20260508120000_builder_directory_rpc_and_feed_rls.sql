-- Public CO/contractor directory as JSON (anon-safe; does not rely on user_roles REST or profiles.role).
-- Relax public post read slightly: treat NULL/empty status like active for legacy rows (RLS + app filter).

CREATE OR REPLACE FUNCTION public.get_public_builder_directory()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Use to_jsonb(p) so we only reference columns that exist on each deployment
  -- (some databases never added profiles.bio, rating, etc.).
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

COMMENT ON FUNCTION public.get_public_builder_directory() IS
  'Public directory rows for registered CO/contractors; SECURITY DEFINER so anon can list without user_roles SELECT.';

REVOKE ALL ON FUNCTION public.get_public_builder_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_directory() TO anon, authenticated;

-- Public feed: treat NULL/blank status as active (legacy rows). Do not expose pending (moderation queue).
DROP POLICY IF EXISTS "builder_posts_select_public_co" ON public.builder_posts;

CREATE POLICY "builder_posts_select_public_co" ON public.builder_posts
FOR SELECT
USING (
  (
    COALESCE(NULLIF(trim(status::text), ''), 'active') = 'active'
    AND public.user_has_professional_builder_role(builder_id)
  )
  OR (
    (select auth.uid()) IS NOT NULL
    AND builder_id = (select auth.uid())
  )
);
