-- ============================================================
-- UjenziXform Database Migration - Builder Posts (Simplified)
-- Created: February 3, 2026
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING POLICIES (if any) to avoid conflicts
-- ============================================================

-- Drop post policies
DROP POLICY IF EXISTS "Only builders can create posts" ON builder_posts;
DROP POLICY IF EXISTS "Builders can update own posts" ON builder_posts;
DROP POLICY IF EXISTS "Builders can delete own posts" ON builder_posts;
DROP POLICY IF EXISTS "Anyone can view public posts" ON builder_posts;

-- Drop story policies
DROP POLICY IF EXISTS "Only builders can create stories" ON builder_stories;
DROP POLICY IF EXISTS "Builders can update own stories" ON builder_stories;
DROP POLICY IF EXISTS "Builders can delete own stories" ON builder_stories;
DROP POLICY IF EXISTS "Anyone can view active stories" ON builder_stories;

-- Drop comment policies
DROP POLICY IF EXISTS "Anyone can view comments" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- Drop like policies
DROP POLICY IF EXISTS "Anyone can view post likes" ON post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON post_likes;

-- Drop story view policies
DROP POLICY IF EXISTS "Builders can view who viewed their stories" ON story_views;
DROP POLICY IF EXISTS "Authenticated users can record story views" ON story_views;

-- ============================================================
-- 2. CREATE TABLES (IF NOT EXISTS)
-- ============================================================

-- Builder Posts Table
CREATE TABLE IF NOT EXISTS builder_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    video_url TEXT,
    image_urls TEXT[],
    thumbnail_url TEXT,
    post_type TEXT DEFAULT 'video' CHECK (post_type IN ('video', 'image', 'text', 'project_update')),
    project_name TEXT,
    project_location TEXT,
    tags TEXT[],
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted', 'pending_approval')),
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'followers', 'private')),
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Builder Stories Table
CREATE TABLE IF NOT EXISTS builder_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    views_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES builder_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES builder_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Story Views Table
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES builder_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

-- ============================================================
-- 3. CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_builder_posts_builder ON builder_posts(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_posts_status ON builder_posts(status);
CREATE INDEX IF NOT EXISTS idx_builder_posts_created ON builder_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_stories_builder ON builder_stories(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_stories_active ON builder_stories(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE builder_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. CREATE RLS POLICIES
-- ============================================================

-- BUILDER POSTS POLICIES
-- Anyone can view active public posts
CREATE POLICY "Anyone can view public posts" ON builder_posts
    FOR SELECT USING (status = 'active');

-- Only professional builders can create posts
CREATE POLICY "Only builders can create posts" ON builder_posts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        builder_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('professional_builder', 'admin')
        )
    );

-- Builders can update own posts
CREATE POLICY "Builders can update own posts" ON builder_posts
    FOR UPDATE USING (builder_id = auth.uid());

-- Builders can delete own posts
CREATE POLICY "Builders can delete own posts" ON builder_posts
    FOR DELETE USING (builder_id = auth.uid());

-- BUILDER STORIES POLICIES
-- Anyone can view active stories
CREATE POLICY "Anyone can view active stories" ON builder_stories
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

-- Only professional builders can create stories
CREATE POLICY "Only builders can create stories" ON builder_stories
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        builder_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('professional_builder', 'admin')
        )
    );

-- Builders can update own stories
CREATE POLICY "Builders can update own stories" ON builder_stories
    FOR UPDATE USING (builder_id = auth.uid());

-- Builders can delete own stories
CREATE POLICY "Builders can delete own stories" ON builder_stories
    FOR DELETE USING (builder_id = auth.uid());

-- POST COMMENTS POLICIES
-- Anyone can view active comments
CREATE POLICY "Anyone can view comments" ON post_comments
    FOR SELECT USING (status = 'active');

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can comment" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update own comments
CREATE POLICY "Users can update own comments" ON post_comments
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete own comments
CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING (user_id = auth.uid());

-- POST LIKES POLICIES
-- Anyone can view likes
CREATE POLICY "Anyone can view post likes" ON post_likes
    FOR SELECT USING (TRUE);

-- Authenticated users can like posts
CREATE POLICY "Authenticated users can like posts" ON post_likes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can unlike
CREATE POLICY "Users can unlike their own likes" ON post_likes
    FOR DELETE USING (user_id = auth.uid());

-- STORY VIEWS POLICIES
-- Builders can see who viewed their stories
CREATE POLICY "Builders can view who viewed their stories" ON story_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM builder_stories 
            WHERE id = story_views.story_id 
            AND builder_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Authenticated users can record views
CREATE POLICY "Authenticated users can record story views" ON story_views
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON builder_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON builder_posts TO authenticated;
GRANT SELECT ON builder_stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON builder_stories TO authenticated;
GRANT SELECT ON post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON post_likes TO authenticated;
GRANT SELECT, INSERT ON story_views TO authenticated;

-- ============================================================
-- 7. HELPER FUNCTION
-- ============================================================

-- Function to check if user is a professional builder
CREATE OR REPLACE FUNCTION is_professional_builder(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_user_id 
        AND role IN ('professional_builder', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_professional_builder TO authenticated;

-- ============================================================
-- Migration Complete!
-- ============================================================
