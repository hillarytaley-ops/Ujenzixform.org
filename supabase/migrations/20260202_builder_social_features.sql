-- ============================================================
-- UjenziXform Database Migration
-- Builder Social Features - Stories, Posts, Likes, Comments, Live
-- Created: February 2, 2026
-- ============================================================

-- ============================================================
-- 1. BUILDER STORIES
-- ============================================================

-- Stories table for builder project updates (24-hour content)
CREATE TABLE IF NOT EXISTS builder_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    thumbnail_url TEXT,
    caption TEXT,
    location TEXT,
    duration INTEGER DEFAULT 5, -- seconds to display (for images)
    views_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story views tracking
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES builder_stories(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewer_ip INET,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

-- Story replies/reactions
CREATE TABLE IF NOT EXISTS story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES builder_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'fire', 'clap', 'wow', 'message')),
    message TEXT, -- For message reactions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id, reaction_type)
);

-- Indexes for stories
CREATE INDEX IF NOT EXISTS idx_builder_stories_builder ON builder_stories(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_stories_active ON builder_stories(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_builder_stories_created ON builder_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);

-- ============================================================
-- 2. BUILDER VIDEO POSTS
-- ============================================================

-- Video posts table
CREATE TABLE IF NOT EXISTS builder_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_type TEXT NOT NULL DEFAULT 'video' CHECK (post_type IN ('video', 'image', 'text', 'project_update')),
    media_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    location TEXT,
    project_id UUID, -- Optional link to a project
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'followers', 'private')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES builder_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'insightful')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES builder_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For replies
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Post shares
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES builder_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_type TEXT DEFAULT 'repost' CHECK (share_type IN ('repost', 'quote', 'external')),
    quote_text TEXT, -- For quote shares
    platform TEXT, -- For external shares (whatsapp, twitter, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_builder_posts_builder ON builder_posts(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_posts_status ON builder_posts(status);
CREATE INDEX IF NOT EXISTS idx_builder_posts_created ON builder_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_posts_featured ON builder_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);

-- ============================================================
-- 3. BOOKMARKS / SAVED CONTENT
-- ============================================================

-- User bookmarks for posts and builders
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bookmark_type TEXT NOT NULL CHECK (bookmark_type IN ('post', 'builder', 'story', 'project')),
    post_id UUID REFERENCES builder_posts(id) ON DELETE CASCADE,
    builder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES builder_stories(id) ON DELETE CASCADE,
    collection_name TEXT DEFAULT 'Saved', -- Allow organizing into collections
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bookmark_type, post_id),
    UNIQUE(user_id, bookmark_type, builder_id),
    UNIQUE(user_id, bookmark_type, story_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_type ON user_bookmarks(bookmark_type);

-- ============================================================
-- 4. BUILDER FOLLOWERS
-- ============================================================

-- Follow relationships between users and builders
CREATE TABLE IF NOT EXISTS builder_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, builder_id),
    CHECK (follower_id != builder_id)
);

CREATE INDEX IF NOT EXISTS idx_builder_followers_builder ON builder_followers(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_followers_follower ON builder_followers(follower_id);

-- ============================================================
-- 5. LIVE STREAMS
-- ============================================================

-- Live streaming sessions
CREATE TABLE IF NOT EXISTS builder_live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    stream_url TEXT, -- RTMP or HLS URL
    stream_key TEXT, -- Private stream key
    location TEXT,
    project_id UUID, -- Optional link to a project
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    peak_viewers INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    recording_url TEXT, -- Saved recording after stream ends
    is_recorded BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live stream viewers
CREATE TABLE IF NOT EXISTS live_stream_viewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES builder_live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    watch_duration INTEGER DEFAULT 0 -- seconds
);

-- Live stream comments (real-time chat)
CREATE TABLE IF NOT EXISTS live_stream_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES builder_live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_highlighted BOOLEAN DEFAULT FALSE, -- For super chats or donations
    donation_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_builder ON builder_live_streams(builder_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON builder_live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_scheduled ON builder_live_streams(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_stream_comments_stream ON live_stream_comments(stream_id);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================

-- User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'like', 'comment', 'reply', 'follow', 'mention', 
        'live_started', 'story_view', 'post_share',
        'project_update', 'system', 'promotion'
    )),
    title TEXT NOT NULL,
    message TEXT,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who triggered the notification
    reference_type TEXT, -- 'post', 'comment', 'story', 'live_stream', etc.
    reference_id UUID,
    image_url TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at DESC);

-- ============================================================
-- 7. CONTENT REPORTS (For Admin Moderation)
-- ============================================================

-- Content reports for moderation
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'story', 'live_stream', 'profile')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN (
        'spam', 'harassment', 'hate_speech', 'violence', 
        'nudity', 'false_information', 'scam', 'copyright', 'other'
    )),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_type ON content_reports(content_type);

-- ============================================================
-- 8. BUILDER PROFILE EXTENSIONS
-- ============================================================

-- Add social profile fields to profiles table
DO $$ 
BEGIN
    -- Followers count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
        ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;
    
    -- Following count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
        ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    END IF;
    
    -- Posts count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'posts_count') THEN
        ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
    END IF;
    
    -- Cover photo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'cover_photo_url') THEN
        ALTER TABLE profiles ADD COLUMN cover_photo_url TEXT;
    END IF;
    
    -- Bio/About
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Website
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE profiles ADD COLUMN website TEXT;
    END IF;
    
    -- Is verified builder
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Verification date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'verified_at') THEN
        ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE builder_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view active stories" ON builder_stories
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

CREATE POLICY "Builders can manage own stories" ON builder_stories
    FOR ALL USING (builder_id = auth.uid());

-- Posts policies
CREATE POLICY "Anyone can view public posts" ON builder_posts
    FOR SELECT USING (status = 'active' AND privacy = 'public');

CREATE POLICY "Builders can manage own posts" ON builder_posts
    FOR ALL USING (builder_id = auth.uid());

-- Likes policies
CREATE POLICY "Anyone can view likes" ON post_likes
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own likes" ON post_likes
    FOR ALL USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Anyone can view active comments" ON post_comments
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create comments" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own comments" ON post_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING (user_id = auth.uid());

-- Bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Followers policies
CREATE POLICY "Anyone can view followers" ON builder_followers
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own follows" ON builder_followers
    FOR ALL USING (follower_id = auth.uid());

-- Live streams policies
CREATE POLICY "Anyone can view live/ended streams" ON builder_live_streams
    FOR SELECT USING (status IN ('live', 'ended'));

CREATE POLICY "Builders can manage own streams" ON builder_live_streams
    FOR ALL USING (builder_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can create reports" ON content_reports
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own reports" ON content_reports
    FOR SELECT USING (reporter_id = auth.uid());

-- ============================================================
-- 10. FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update likes count on posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE builder_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE builder_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_likes ON post_likes;
CREATE TRIGGER trigger_update_post_likes
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Function to update comments count on posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE builder_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE builder_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_comments ON post_comments;
CREATE TRIGGER trigger_update_post_comments
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Function to update followers count
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.builder_id;
        UPDATE profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE user_id = OLD.builder_id;
        UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_followers ON builder_followers;
CREATE TRIGGER trigger_update_followers
    AFTER INSERT OR DELETE ON builder_followers
    FOR EACH ROW EXECUTE FUNCTION update_followers_count();

-- Function to update posts count on profiles
CREATE OR REPLACE FUNCTION update_posts_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET posts_count = posts_count + 1 WHERE user_id = NEW.builder_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE user_id = OLD.builder_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_posts_count ON builder_posts;
CREATE TRIGGER trigger_update_posts_count
    AFTER INSERT OR DELETE ON builder_posts
    FOR EACH ROW EXECUTE FUNCTION update_posts_count();

-- Function to increment story views
CREATE OR REPLACE FUNCTION increment_story_views(p_story_id UUID, p_viewer_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Try to insert view record (will fail if already exists due to unique constraint)
    INSERT INTO story_views (story_id, viewer_id)
    VALUES (p_story_id, p_viewer_id)
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    -- Update view count
    UPDATE builder_stories 
    SET views_count = (SELECT COUNT(*) FROM story_views WHERE story_id = p_story_id)
    WHERE id = p_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, actor_id, 
        reference_type, reference_id, action_url
    )
    VALUES (
        p_user_id, p_type, p_title, p_message, p_actor_id,
        p_reference_type, p_reference_id, p_action_url
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE builder_stories 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON builder_stories TO authenticated;
GRANT SELECT, INSERT ON story_views TO authenticated;
GRANT SELECT, INSERT, DELETE ON story_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON builder_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON comment_likes TO authenticated;
GRANT SELECT, INSERT ON post_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bookmarks TO authenticated;
GRANT SELECT, INSERT, DELETE ON builder_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON builder_live_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON live_stream_viewers TO authenticated;
GRANT SELECT, INSERT ON live_stream_comments TO authenticated;
GRANT SELECT, UPDATE ON user_notifications TO authenticated;
GRANT SELECT, INSERT ON content_reports TO authenticated;

GRANT EXECUTE ON FUNCTION increment_story_views TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_stories TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
