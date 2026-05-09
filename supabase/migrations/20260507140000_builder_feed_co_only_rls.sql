-- Builders social feed: only professional_builder may create posts; public reads active CO posts.
-- Exposes RPC for directory UIs that cannot SELECT user_roles as anon.

CREATE OR REPLACE FUNCTION public.user_has_professional_builder_role(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role::text = 'professional_builder'
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_professional_builder_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_professional_builder_role(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_professional_builder_user_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(DISTINCT ur.user_id)
      FROM public.user_roles ur
      WHERE ur.role::text = 'professional_builder'
    ),
    ARRAY[]::uuid[]
  );
$$;

REVOKE ALL ON FUNCTION public.get_professional_builder_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_builder_user_ids() TO anon, authenticated;

-- builder_posts: replace permissive read + insert with CO-scoped rules
DROP POLICY IF EXISTS "builder_posts_public_read" ON public.builder_posts;
DROP POLICY IF EXISTS "View active or own posts" ON public.builder_posts;
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.builder_posts;
DROP POLICY IF EXISTS "builder_posts_view_active" ON public.builder_posts;
DROP POLICY IF EXISTS "builder_posts_create" ON public.builder_posts;
DROP POLICY IF EXISTS "Only builders can create posts" ON public.builder_posts;
DROP POLICY IF EXISTS "builder_posts_select_public_co" ON public.builder_posts;

CREATE POLICY "builder_posts_select_public_co" ON public.builder_posts
FOR SELECT
USING (
  (
    status = 'active'
    AND public.user_has_professional_builder_role(builder_id)
  )
  OR (
    (select auth.uid()) IS NOT NULL
    AND builder_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.builder_posts;
DROP POLICY IF EXISTS "professional_builders_insert_posts" ON public.builder_posts;

CREATE POLICY "professional_builders_insert_posts" ON public.builder_posts
FOR INSERT
TO authenticated
WITH CHECK (
  builder_id = (select auth.uid())
  AND public.user_has_professional_builder_role((select auth.uid()))
);
