-- ============================================================
-- Post Likes and Comments Tables
-- For persisting likes and comments on builder posts
-- Created: February 15, 2026
-- ============================================================

-- 1. Post Likes Table
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);

-- Enable RLS for post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_likes
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
    CREATE POLICY "Anyone can view likes"
        ON public.post_likes FOR SELECT
        USING (true);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
    CREATE POLICY "Authenticated users can like posts"
        ON public.post_likes FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.post_likes;
    CREATE POLICY "Users can unlike their own likes"
        ON public.post_likes FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 2. Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created ON public.post_comments(created_at DESC);

-- Enable RLS for post_comments
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_comments
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
    CREATE POLICY "Anyone can view comments"
        ON public.post_comments FOR SELECT
        USING (true);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can comment" ON public.post_comments;
    CREATE POLICY "Authenticated users can comment"
        ON public.post_comments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
    CREATE POLICY "Users can update own comments"
        ON public.post_comments FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
    CREATE POLICY "Users can delete own comments"
        ON public.post_comments FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 3. Auto-update timestamp trigger for comments
CREATE OR REPLACE FUNCTION update_post_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON public.post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_updated_at();

-- 4. Grant permissions
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;

GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
