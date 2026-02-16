-- ============================================================
-- Fix RLS for Builder Video Gallery Public Access
-- Created: February 16, 2026
-- ============================================================

-- ============================================================
-- 1. PROFILES - Allow public read for builder info display
-- ============================================================

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

-- Create policy for public profile viewing (needed for video gallery)
CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================
-- 2. VIDEO_COMMENTS - Allow public read and authenticated insert
-- ============================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS video_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    commenter_name TEXT NOT NULL,
    commenter_email TEXT,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES video_comments(id),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view approved comments" ON video_comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON video_comments;

-- Anyone can view approved comments
CREATE POLICY "Anyone can view approved comments"
ON video_comments FOR SELECT
TO anon, authenticated
USING (is_approved = true);

-- Anyone can insert comments (guests too)
CREATE POLICY "Anyone can insert comments"
ON video_comments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================================
-- 3. VIDEO_LIKES - Allow public read and insert
-- ============================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    guest_identifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, user_id),
    UNIQUE(video_id, guest_identifier)
);

-- Enable RLS
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
DROP POLICY IF EXISTS "Anyone can insert likes" ON video_likes;

-- Anyone can view likes
CREATE POLICY "Anyone can view likes"
ON video_likes FOR SELECT
TO anon, authenticated
USING (true);

-- Anyone can insert likes
CREATE POLICY "Anyone can insert likes"
ON video_likes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================================
-- 4. VIDEO_VIEWS - Allow public insert for tracking
-- ============================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    guest_identifier TEXT,
    watch_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert views" ON video_views;

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can insert views"
ON video_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================================
-- 5. BUILDER_VIDEOS - Ensure public read for published videos
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published videos" ON builder_videos;
DROP POLICY IF EXISTS "Public can view published videos" ON builder_videos;

-- Anyone can view published videos
CREATE POLICY "Anyone can view published videos"
ON builder_videos FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON profiles TO anon;
GRANT SELECT, INSERT ON video_comments TO anon, authenticated;
GRANT SELECT, INSERT ON video_likes TO anon, authenticated;
GRANT INSERT ON video_views TO anon, authenticated;
GRANT SELECT ON builder_videos TO anon;

-- ============================================================
-- Migration Complete
-- ============================================================
