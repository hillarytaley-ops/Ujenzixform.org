-- ============================================================
-- UjenziXform Database Migration
-- Publish All Existing Builder Content
-- Created: February 23, 2026
-- 
-- This migration makes all existing builder posts and videos
-- visible to visitors by setting them to active/published status.
-- ============================================================

-- ============================================================
-- 1. UPDATE ALL BUILDER POSTS TO ACTIVE STATUS
-- ============================================================

-- Update all posts that are pending or have null status to 'active'
UPDATE builder_posts 
SET status = 'active' 
WHERE status IS NULL 
   OR status = 'pending' 
   OR status = '';

-- Log how many posts were updated
DO $$
DECLARE
    posts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO posts_count FROM builder_posts WHERE status = 'active';
    RAISE NOTICE 'Total active posts after update: %', posts_count;
END $$;

-- ============================================================
-- 2. PUBLISH ALL BUILDER VIDEOS
-- ============================================================

-- Update all videos that are not published to published
UPDATE builder_videos 
SET is_published = true 
WHERE is_published = false 
   OR is_published IS NULL;

-- Log how many videos were updated
DO $$
DECLARE
    videos_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO videos_count FROM builder_videos WHERE is_published = true;
    RAISE NOTICE 'Total published videos after update: %', videos_count;
END $$;

-- ============================================================
-- 3. SET DEFAULT VALUES FOR NEW CONTENT
-- ============================================================

-- Ensure new posts default to 'active' status
ALTER TABLE builder_posts 
ALTER COLUMN status SET DEFAULT 'active';

-- Ensure new videos default to published
ALTER TABLE builder_videos 
ALTER COLUMN is_published SET DEFAULT true;

-- ============================================================
-- Migration Complete
-- All existing builder content is now visible to visitors
-- ============================================================
