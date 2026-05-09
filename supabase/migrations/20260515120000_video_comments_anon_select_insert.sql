-- Project showcase: visitors read comments (VideoPlayer uses anon JWT).
-- 401 on GET /video_comments usually means no SELECT for anon or no RLS policy for role anon.

GRANT SELECT, INSERT ON public.video_comments TO anon;

DROP POLICY IF EXISTS "video_comments_select" ON public.video_comments;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.video_comments;
DROP POLICY IF EXISTS "Users can view own comments" ON public.video_comments;

CREATE POLICY "video_comments_select_public" ON public.video_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_approved, true) = true
    OR (
      (select auth.uid()) IS NOT NULL
      AND user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "video_comments_insert" ON public.video_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.video_comments;
DROP POLICY IF EXISTS "Public users can comment" ON public.video_comments;

CREATE POLICY "video_comments_insert_public" ON public.video_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (select auth.uid()) IS NOT NULL
      AND user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
    OR (
      (select auth.uid()) IS NULL
      AND user_id IS NULL
    )
  );
