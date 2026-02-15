-- ============================================================
-- Fix Builder Storage Bucket and Posts Table
-- Allow image uploads and ensure image_url column exists
-- Created: February 15, 2026
-- ============================================================

-- 1. Create storage bucket for builder content if it doesn't exist
-- Note: This needs to be run in Supabase Dashboard or via supabase CLI
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'builder-videos',
--   'builder-videos', 
--   true,
--   524288000, -- 500MB
--   ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 
--         'image/jpeg', 'image/png', 'image/gif', 'image/webp']
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
--                              'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Ensure builder_posts table has image_url column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_posts' AND column_name = 'image_url') THEN
        ALTER TABLE public.builder_posts ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to builder_posts';
    END IF;
END $$;

-- 3. Storage policies for builder-videos bucket
-- Allow authenticated users to upload
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can upload builder content" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view builder content" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own builder content" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own builder content" ON storage.objects;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table not found, skipping policy drops';
END $$;

-- Create storage policies
DO $$
BEGIN
    -- Policy: Authenticated users can upload to builder-videos
    CREATE POLICY "Authenticated users can upload builder content"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'builder-videos' 
        AND auth.role() = 'authenticated'
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists';
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table not found';
END $$;

DO $$
BEGIN
    -- Policy: Anyone can view builder-videos (public bucket)
    CREATE POLICY "Anyone can view builder content"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'builder-videos');
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists';
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table not found';
END $$;

DO $$
BEGIN
    -- Policy: Users can update their own content
    CREATE POLICY "Users can update own builder content"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'builder-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists';
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table not found';
END $$;

DO $$
BEGIN
    -- Policy: Users can delete their own content
    CREATE POLICY "Users can delete own builder content"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'builder-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists';
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table not found';
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
