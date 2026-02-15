-- ============================================================
-- Builder Stories Table Migration
-- For Instagram/TikTok-style short-form content (Reels)
-- Created: February 15, 2026
-- ============================================================

-- Create builder_stories table
CREATE TABLE IF NOT EXISTS public.builder_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_builder_stories_builder ON public.builder_stories(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_stories_created ON public.builder_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_stories_active ON public.builder_stories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_builder_stories_expires ON public.builder_stories(expires_at);

-- Enable RLS
ALTER TABLE public.builder_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view active stories (public feed)
CREATE POLICY "Anyone can view active stories"
    ON public.builder_stories FOR SELECT
    USING (is_active = true AND expires_at > NOW());

-- Builders can view their own stories (including expired)
CREATE POLICY "Builders can view own stories"
    ON public.builder_stories FOR SELECT
    USING (builder_id = auth.uid());

-- Builders can create their own stories
CREATE POLICY "Builders can create stories"
    ON public.builder_stories FOR INSERT
    WITH CHECK (builder_id = auth.uid());

-- Builders can update their own stories
CREATE POLICY "Builders can update own stories"
    ON public.builder_stories FOR UPDATE
    USING (builder_id = auth.uid())
    WITH CHECK (builder_id = auth.uid());

-- Builders can delete their own stories
CREATE POLICY "Builders can delete own stories"
    ON public.builder_stories FOR DELETE
    USING (builder_id = auth.uid());

-- Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION update_builder_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_builder_stories_updated_at ON public.builder_stories;
CREATE TRIGGER update_builder_stories_updated_at
    BEFORE UPDATE ON public.builder_stories
    FOR EACH ROW
    EXECUTE FUNCTION update_builder_stories_updated_at();

-- Function to increment story views
CREATE OR REPLACE FUNCTION increment_story_views(story_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.builder_stories 
    SET views = views + 1 
    WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.builder_stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_stories TO authenticated;
GRANT EXECUTE ON FUNCTION increment_story_views TO authenticated;

-- Add to realtime publication for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_stories;

-- ============================================================
-- Migration Complete
-- ============================================================
