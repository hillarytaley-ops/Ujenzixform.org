-- ============================================================
-- UjenziXform - Builder Posts RLS Policies
-- Run this AFTER the tables are created
-- ============================================================

-- ============================================================
-- BUILDER POSTS POLICIES
-- ============================================================

-- Anyone can view active posts
CREATE POLICY "Anyone can view public posts" ON builder_posts
    FOR SELECT USING (status = 'active');

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts" ON builder_posts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND builder_id = auth.uid());

-- Builders can update own posts
CREATE POLICY "Builders can update own posts" ON builder_posts
    FOR UPDATE USING (builder_id = auth.uid());

-- Builders can delete own posts
CREATE POLICY "Builders can delete own posts" ON builder_posts
    FOR DELETE USING (builder_id = auth.uid());

-- ============================================================
-- BUILDER STORIES POLICIES
-- ============================================================

-- Anyone can view active stories
CREATE POLICY "Anyone can view active stories" ON builder_stories
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

-- Authenticated users can create stories
CREATE POLICY "Authenticated users can create stories" ON builder_stories
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND builder_id = auth.uid());

-- Builders can update own stories
CREATE POLICY "Builders can update own stories" ON builder_stories
    FOR UPDATE USING (builder_id = auth.uid());

-- Builders can delete own stories
CREATE POLICY "Builders can delete own stories" ON builder_stories
    FOR DELETE USING (builder_id = auth.uid());

-- ============================================================
-- POST COMMENTS POLICIES
-- ============================================================

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

-- ============================================================
-- POST LIKES POLICIES
-- ============================================================

-- Anyone can view likes
CREATE POLICY "Anyone can view post likes" ON post_likes
    FOR SELECT USING (TRUE);

-- Authenticated users can like posts
CREATE POLICY "Authenticated users can like posts" ON post_likes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can unlike
CREATE POLICY "Users can unlike their own likes" ON post_likes
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- STORY VIEWS POLICIES
-- ============================================================

-- Users can view their own views or builders can see who viewed
CREATE POLICY "View story views" ON story_views
    FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can record views
CREATE POLICY "Record story views" ON story_views
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============================================================
-- DONE! Policies created successfully.
-- ============================================================
