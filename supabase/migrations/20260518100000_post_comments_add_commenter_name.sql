-- Guest / anon comments send commenter_name from the Market Hub UI (BuilderFeed).
-- Older databases only had user_id + content; PostgREST then errors:
-- "Could not find the 'commenter_name' column of 'post_comments' in the schema cache"

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS commenter_name TEXT DEFAULT 'Anonymous';

COMMENT ON COLUMN public.post_comments.commenter_name IS
  'Display label for the commenter; used when user_id is null (guest_identifier set).';

-- Bust PostgREST schema cache (Supabase API) so the new column is visible immediately.
NOTIFY pgrst, 'reload schema';
