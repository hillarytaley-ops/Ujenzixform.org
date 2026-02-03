-- ============================================================
-- UjenziXform - Create Builder Posts Tables
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: CREATE ALL TABLES
-- ============================================================

-- Builder Posts Table (Facebook-like posts)
CREATE TABLE IF NOT EXISTS builder_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    video_url TEXT,
    image_urls TEXT[],
    thumbnail_url TEXT,
    post_type TEXT DEFAULT 'video',
    project_name TEXT,
    project_location TEXT,
    tags TEXT[],
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    privacy TEXT DEFAULT 'public',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Builder Stories Table (24-hour content)
CREATE TABLE IF NOT EXISTS builder_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
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
    status TEXT DEFAULT 'active',
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
-- STEP 2: CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_builder_posts_builder ON builder_posts(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_posts_status ON builder_posts(status);
CREATE INDEX IF NOT EXISTS idx_builder_posts_created ON builder_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_stories_builder ON builder_stories(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_stories_active ON builder_stories(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE builder_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: GRANT BASIC PERMISSIONS
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
-- DONE! Tables created successfully.
-- Now run the second migration file for RLS policies.
-- ============================================================
