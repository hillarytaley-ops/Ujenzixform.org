-- ============================================================
-- Add image_url column to builder_posts table
-- For supporting photo posts alongside videos
-- Created: February 15, 2026
-- ============================================================

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_posts' AND column_name = 'image_url') THEN
        ALTER TABLE public.builder_posts ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Update post_type check constraint to include 'image'
-- First drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'builder_posts_post_type_check' 
               AND table_name = 'builder_posts') THEN
        ALTER TABLE public.builder_posts DROP CONSTRAINT builder_posts_post_type_check;
    END IF;
END $$;

-- Add updated constraint that includes 'image' type
ALTER TABLE public.builder_posts 
ADD CONSTRAINT builder_posts_post_type_check 
CHECK (post_type IN ('text', 'video', 'image', 'project_update', 'milestone'));

-- Create index for faster queries on image posts
CREATE INDEX IF NOT EXISTS idx_builder_posts_image_url ON public.builder_posts(image_url) WHERE image_url IS NOT NULL;

-- ============================================================
-- Migration Complete
-- ============================================================
