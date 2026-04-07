-- Builder feed & project showcase use /storage/v1/object/public/builder-videos/...
-- If public = false, those URLs 403 and <video> cannot play.

UPDATE storage.buckets
SET public = true
WHERE id = 'builder-videos';

-- New projects: create bucket if missing (same idea as 20260213).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'builder-videos',
  'builder-videos',
  true,
  524288000,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/3gpp',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = COALESCE(
    NULLIF(storage.buckets.file_size_limit, 0),
    EXCLUDED.file_size_limit
  );
