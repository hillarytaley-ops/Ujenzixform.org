-- Social feed: public read was gated on user_has_professional_builder_role(builder_id).
-- Legacy posts or missing user_roles rows then vanished for guests while stats still counted active rows.
-- Public may read all non-deleted "live" statuses; INSERT remains CO-only (professional_builders_insert_posts).

DROP POLICY IF EXISTS "builder_posts_select_public_co" ON public.builder_posts;

CREATE POLICY "builder_posts_select_public_co" ON public.builder_posts
FOR SELECT
USING (
  (
    COALESCE(NULLIF(trim(status::text), ''), 'active') = 'active'
  )
  OR (
    (select auth.uid()) IS NOT NULL
    AND builder_id = (select auth.uid())
  )
);
