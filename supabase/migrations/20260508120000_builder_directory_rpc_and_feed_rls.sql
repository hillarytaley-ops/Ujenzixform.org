-- Public CO/contractor directory as JSON (anon-safe; does not rely on user_roles REST or profiles.role).
-- Relax public post read slightly: treat NULL/empty status like active for legacy rows (RLS + app filter).

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
          jsonb_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'full_name', p.full_name,
            'company_name', p.company_name,
            'phone', p.phone,
            'email', p.email,
            'location', p.location,
            'bio', p.bio,
            'is_verified', p.is_verified,
            'avatar_url', p.avatar_url,
            'rating', p.rating,
            'total_projects', p.total_projects,
            'total_reviews', p.total_reviews,
            'specialties', p.specialties
          ) AS row_json,
          lower(coalesce(nullif(trim(p.company_name), ''), p.full_name, '')) AS sort_key
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
