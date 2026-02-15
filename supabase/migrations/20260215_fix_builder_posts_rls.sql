-- ============================================================
-- Fix Builder Posts RLS Policy
-- Allow all authenticated users to create posts
-- Created: February 15, 2026
-- ============================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Only builders can create posts" ON builder_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON builder_posts;
DROP POLICY IF EXISTS "builder_posts_create" ON builder_posts;

-- Create new permissive policy for authenticated users
-- Any authenticated user can create posts (their builder_id must match their auth.uid())
CREATE POLICY "Authenticated users can create posts" ON builder_posts
    FOR INSERT 
    TO authenticated
    WITH CHECK (builder_id = auth.uid());

-- Also ensure the SELECT policy allows users to see their own posts regardless of status
DROP POLICY IF EXISTS "Anyone can view public posts" ON builder_posts;
DROP POLICY IF EXISTS "builder_posts_view_active" ON builder_posts;

-- View policy: see active posts OR your own posts (any status)
CREATE POLICY "View active or own posts" ON builder_posts
    FOR SELECT
    USING (
        status = 'active' 
        OR builder_id = auth.uid()
    );

-- Ensure update policy exists
DROP POLICY IF EXISTS "Builders can update own posts" ON builder_posts;
DROP POLICY IF EXISTS "builder_posts_update_own" ON builder_posts;

CREATE POLICY "Builders can update own posts" ON builder_posts
    FOR UPDATE
    TO authenticated
    USING (builder_id = auth.uid())
    WITH CHECK (builder_id = auth.uid());

-- Ensure delete policy exists
DROP POLICY IF EXISTS "Builders can delete own posts" ON builder_posts;
DROP POLICY IF EXISTS "builder_posts_delete_own" ON builder_posts;

CREATE POLICY "Builders can delete own posts" ON builder_posts
    FOR DELETE
    TO authenticated
    USING (builder_id = auth.uid());

-- Grant permissions
GRANT SELECT ON builder_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON builder_posts TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
