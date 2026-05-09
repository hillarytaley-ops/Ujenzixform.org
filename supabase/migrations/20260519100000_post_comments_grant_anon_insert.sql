-- Fix PostgREST error: "permission denied for table post_comments" for anonymous visitors.
-- 20260216_sync_social_and_showcase.sql granted INSERT on post_comments only to authenticated;
-- 20260509120000_public_feed_guest_reactions.sql adds anon INSERT but may be missing on production.

GRANT SELECT ON TABLE public.post_comments TO anon;
GRANT INSERT ON TABLE public.post_comments TO anon;

-- RLS: keep a single permissive insert policy (safe with public feed; spam/abuse can be tightened later).
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
CREATE POLICY "post_comments_insert" ON public.post_comments
  FOR INSERT
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
