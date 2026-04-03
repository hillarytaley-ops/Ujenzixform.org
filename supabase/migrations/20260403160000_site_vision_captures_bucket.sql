-- Private bucket for site-vision frame / thumbnail uploads (signed PUT from workers or browsers).
-- Object path shape: {camera_id}/{yyyy-mm-dd}/{uuid}.{ext} — first segment must be a UUID for RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-vision-captures',
  'site-vision-captures',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "site_vision_captures_select_by_camera_access" ON storage.objects;
DROP POLICY IF EXISTS "site_vision_captures_insert_signed_upload" ON storage.objects;
DROP POLICY IF EXISTS "site_vision_captures_insert_signed_upload_anon" ON storage.objects;
DROP POLICY IF EXISTS "site_vision_captures_insert_signed_upload_authenticated" ON storage.objects;

-- Authenticated users may read objects when they may access the camera (first path segment).
CREATE POLICY "site_vision_captures_select_by_camera_access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'site-vision-captures'
  AND (split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  AND public.auth_can_access_camera((split_part(name, '/', 1))::uuid)
);

-- Signed upload URLs (PUT with token; request role is often `anon`) — path must start with a camera UUID folder.
CREATE POLICY "site_vision_captures_insert_signed_upload_anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'site-vision-captures'
  AND (split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

CREATE POLICY "site_vision_captures_insert_signed_upload_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-vision-captures'
  AND (split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);
