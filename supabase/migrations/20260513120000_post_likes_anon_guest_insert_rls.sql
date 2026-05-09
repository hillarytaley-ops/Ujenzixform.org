-- Guest likes: GRANT INSERT TO anon is not enough — RLS WITH CHECK must allow
-- user_id IS NULL + guest_identifier (visitors). Older policies only allowed authenticated inserts.

DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON public.post_likes;

CREATE POLICY "post_likes_insert" ON public.post_likes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
    OR
    (
      (select auth.uid()) IS NULL
      AND user_id IS NULL
      AND guest_identifier IS NOT NULL
      AND length(btrim(guest_identifier)) >= 8
    )
  );

GRANT INSERT ON public.post_likes TO anon;
