-- ============================================================
-- COMPLETE FIX for Builder Video Gallery
-- Run this in Supabase SQL Editor
-- Created: February 16, 2026
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS TO builder_videos
-- ============================================================

ALTER TABLE builder_videos ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE builder_videos ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE builder_videos ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- ============================================================
-- 2. PROFILES - Allow public read
-- ============================================================

-- Drop ALL existing select policies on profiles
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Create simple public read policy
CREATE POLICY "profiles_public_read"
ON profiles FOR SELECT
USING (true);

-- ============================================================
-- 3. VIDEO_LIKES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID,
    guest_identifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "video_likes_select" ON video_likes;
DROP POLICY IF EXISTS "video_likes_insert" ON video_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
DROP POLICY IF EXISTS "Anyone can insert likes" ON video_likes;

-- Simple policies
CREATE POLICY "video_likes_select" ON video_likes FOR SELECT USING (true);
CREATE POLICY "video_likes_insert" ON video_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "video_likes_delete" ON video_likes FOR DELETE USING (true);

-- ============================================================
-- 4. VIDEO_COMMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS video_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID,
    commenter_name TEXT NOT NULL DEFAULT 'Anonymous',
    commenter_email TEXT,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "video_comments_select" ON video_comments;
DROP POLICY IF EXISTS "video_comments_insert" ON video_comments;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON video_comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON video_comments;

-- Simple policies
CREATE POLICY "video_comments_select" ON video_comments FOR SELECT USING (true);
CREATE POLICY "video_comments_insert" ON video_comments FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. VIDEO_VIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID,
    guest_identifier TEXT,
    watch_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "video_views_insert" ON video_views;
DROP POLICY IF EXISTS "Anyone can insert views" ON video_views;

-- Simple policy
CREATE POLICY "video_views_insert" ON video_views FOR INSERT WITH CHECK (true);

-- ============================================================
-- 6. BUILDER_VIDEOS - Ensure public read
-- ============================================================

DROP POLICY IF EXISTS "builder_videos_public_read" ON builder_videos;
DROP POLICY IF EXISTS "Anyone can view published videos" ON builder_videos;
DROP POLICY IF EXISTS "Public can view published videos" ON builder_videos;

CREATE POLICY "builder_videos_public_read"
ON builder_videos FOR SELECT
USING (is_published = true);

-- ============================================================
-- 7. GRANT ALL PERMISSIONS
-- ============================================================

GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT, INSERT ON video_likes TO anon, authenticated;
GRANT SELECT, INSERT ON video_comments TO anon, authenticated;
GRANT SELECT, INSERT ON video_views TO anon, authenticated;
GRANT SELECT ON builder_videos TO anon, authenticated;

-- ============================================================
-- 8. DROP ANY TRIGGERS THAT MIGHT CAUSE ISSUES
-- ============================================================

DROP TRIGGER IF EXISTS update_video_likes_count ON video_likes;
DROP TRIGGER IF EXISTS update_video_comments_count ON video_comments;
DROP FUNCTION IF EXISTS update_video_likes_count();
DROP FUNCTION IF EXISTS update_video_comments_count();

-- ============================================================
-- DONE! Refresh the page after running this.
-- ============================================================
