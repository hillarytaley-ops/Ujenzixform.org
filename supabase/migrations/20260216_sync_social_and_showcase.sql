-- ============================================================
-- Sync Social Feed and Project Showcase RLS Policies
-- Ensures both features work correctly with same permissions
-- Created: February 16, 2026
-- ============================================================

-- ============================================================
-- 1. POST_LIKES TABLE (for Social Feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_identifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_select" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;

CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- 2. POST_COMMENTS TABLE (for Social Feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    commenter_name TEXT DEFAULT 'Anonymous',
    parent_comment_id UUID,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created ON public.post_comments(created_at DESC);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_update" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;

CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "post_comments_update" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. VIDEO_LIKES TABLE (for Project Showcase)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_identifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_likes_video ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON public.video_likes(user_id);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "video_likes_select" ON public.video_likes;
DROP POLICY IF EXISTS "video_likes_insert" ON public.video_likes;
DROP POLICY IF EXISTS "video_likes_delete" ON public.video_likes;

CREATE POLICY "video_likes_select" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "video_likes_insert" ON public.video_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "video_likes_delete" ON public.video_likes FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- 4. VIDEO_COMMENTS TABLE (for Project Showcase)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    commenter_name TEXT NOT NULL DEFAULT 'Anonymous',
    commenter_email TEXT,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID,
    is_approved BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user ON public.video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created ON public.video_comments(created_at DESC);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "video_comments_select" ON public.video_comments;
DROP POLICY IF EXISTS "video_comments_insert" ON public.video_comments;
DROP POLICY IF EXISTS "video_comments_update" ON public.video_comments;
DROP POLICY IF EXISTS "video_comments_delete" ON public.video_comments;

CREATE POLICY "video_comments_select" ON public.video_comments FOR SELECT USING (true);
CREATE POLICY "video_comments_insert" ON public.video_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "video_comments_update" ON public.video_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "video_comments_delete" ON public.video_comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. BUILDER_POSTS TABLE (for Social Feed)
-- ============================================================
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_posts' AND column_name = 'likes_count') THEN
        ALTER TABLE builder_posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_posts' AND column_name = 'comments_count') THEN
        ALTER TABLE builder_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_posts' AND column_name = 'shares_count') THEN
        ALTER TABLE builder_posts ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure public can read builder_posts
DROP POLICY IF EXISTS "builder_posts_public_read" ON builder_posts;
CREATE POLICY "builder_posts_public_read" ON builder_posts FOR SELECT USING (true);

-- ============================================================
-- 6. BUILDER_VIDEOS TABLE (for Project Showcase)
-- ============================================================
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_videos' AND column_name = 'likes_count') THEN
        ALTER TABLE builder_videos ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_videos' AND column_name = 'comments_count') THEN
        ALTER TABLE builder_videos ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builder_videos' AND column_name = 'views_count') THEN
        ALTER TABLE builder_videos ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure public can read published builder_videos
DROP POLICY IF EXISTS "builder_videos_public_read" ON builder_videos;
CREATE POLICY "builder_videos_public_read" ON builder_videos FOR SELECT USING (is_published = true);

-- ============================================================
-- 7. PROFILES TABLE - Public Read Access
-- ============================================================
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================
GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;

GRANT SELECT ON public.post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

GRANT SELECT ON public.video_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.video_likes TO authenticated;

GRANT SELECT ON public.video_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.video_comments TO authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.builder_posts TO anon, authenticated;
GRANT SELECT ON public.builder_videos TO anon, authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
