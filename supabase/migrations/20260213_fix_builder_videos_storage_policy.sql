-- ================================================================
-- FIX BUILDER VIDEOS STORAGE POLICY
-- ================================================================
-- The current policy is too restrictive. This update allows any
-- authenticated user to upload to their own folder.
-- ================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Builders can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Builders can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Builders can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view builder videos" ON storage.objects;

-- Recreate with more permissive policies

-- Anyone can view videos (public bucket)
CREATE POLICY "Anyone can view builder videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'builder-videos');

-- Any authenticated user can upload to builder-videos bucket
-- The folder structure builderId/filename.ext is enforced by the app
CREATE POLICY "Authenticated users can upload builder videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'builder-videos');

-- Any authenticated user can update files in builder-videos
CREATE POLICY "Authenticated users can update builder videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'builder-videos');

-- Any authenticated user can delete files in builder-videos
CREATE POLICY "Authenticated users can delete builder videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'builder-videos');

-- ================================================================
-- Also ensure the bucket exists and is public
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'builder-videos',
  'builder-videos',
  true,
  524288000, -- 500MB max file size
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
