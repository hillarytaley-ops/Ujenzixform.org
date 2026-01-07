-- ================================================================
-- BUILDER VIDEO SHOWCASE SYSTEM
-- ================================================================
-- Creates tables and storage for builders to upload project videos
-- with public comments and likes functionality
-- ================================================================

-- Step 1: Create storage bucket for builder videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'builder-videos',
  'builder-videos',
  true,
  524288000, -- 500MB max file size
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];

-- Step 2: Create builder_videos table
CREATE TABLE IF NOT EXISTS public.builder_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  project_type TEXT, -- e.g., 'Residential', 'Commercial', 'Renovation'
  project_location TEXT,
  project_duration TEXT, -- e.g., '3 months', '6 weeks'
  project_cost_range TEXT, -- e.g., '5M-10M KES'
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create video_likes table
CREATE TABLE IF NOT EXISTS public.video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.builder_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_identifier TEXT, -- For non-authenticated users (IP or session)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id),
  UNIQUE(video_id, guest_identifier)
);

-- Step 4: Create video_comments table
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.builder_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true, -- For moderation
  parent_comment_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create video_views table for analytics
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.builder_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_identifier TEXT,
  watch_duration INTEGER DEFAULT 0, -- seconds watched
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_builder_videos_builder_id ON public.builder_videos(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_videos_created_at ON public.builder_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_videos_is_published ON public.builder_videos(is_published);
CREATE INDEX IF NOT EXISTS idx_builder_videos_is_featured ON public.builder_videos(is_featured);
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);

-- Step 7: Enable Row Level Security
ALTER TABLE public.builder_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies for builder_videos

-- Anyone can view published videos
CREATE POLICY "Anyone can view published videos"
ON public.builder_videos FOR SELECT
TO public
USING (is_published = true);

-- Builders can view their own videos (published or not)
CREATE POLICY "Builders can view own videos"
ON public.builder_videos FOR SELECT
TO authenticated
USING (builder_id = auth.uid());

-- Builders can insert their own videos
CREATE POLICY "Builders can upload own videos"
ON public.builder_videos FOR INSERT
TO authenticated
WITH CHECK (builder_id = auth.uid());

-- Builders can update their own videos
CREATE POLICY "Builders can update own videos"
ON public.builder_videos FOR UPDATE
TO authenticated
USING (builder_id = auth.uid())
WITH CHECK (builder_id = auth.uid());

-- Builders can delete their own videos
CREATE POLICY "Builders can delete own videos"
ON public.builder_videos FOR DELETE
TO authenticated
USING (builder_id = auth.uid());

-- Step 9: Create RLS Policies for video_likes

-- Anyone can view likes (count)
CREATE POLICY "Anyone can view likes"
ON public.video_likes FOR SELECT
TO public
USING (true);

-- Authenticated users can like videos
CREATE POLICY "Authenticated users can like videos"
ON public.video_likes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Public users can like videos (guest)
CREATE POLICY "Public users can like videos"
ON public.video_likes FOR INSERT
TO public
WITH CHECK (user_id IS NULL AND guest_identifier IS NOT NULL);

-- Users can delete their own likes
CREATE POLICY "Users can unlike videos"
ON public.video_likes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Guests can unlike videos
CREATE POLICY "Guests can unlike videos"
ON public.video_likes FOR DELETE
TO public
USING (user_id IS NULL AND guest_identifier IS NOT NULL);

-- Step 10: Create RLS Policies for video_comments

-- Anyone can view approved comments
CREATE POLICY "Anyone can view approved comments"
ON public.video_comments FOR SELECT
TO public
USING (is_approved = true);

-- Comment authors can view their own comments
CREATE POLICY "Users can view own comments"
ON public.video_comments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can post comments
CREATE POLICY "Authenticated users can comment"
ON public.video_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Public users can post comments (guest)
CREATE POLICY "Public users can comment"
ON public.video_comments FOR INSERT
TO public
WITH CHECK (user_id IS NULL);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.video_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.video_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 11: Create RLS Policies for video_views

-- Anyone can insert views
CREATE POLICY "Anyone can record views"
ON public.video_views FOR INSERT
TO public
WITH CHECK (true);

-- Only video owner can view their analytics
CREATE POLICY "Builder can view own video analytics"
ON public.video_views FOR SELECT
TO authenticated
USING (
  video_id IN (
    SELECT id FROM public.builder_videos WHERE builder_id = auth.uid()
  )
);

-- Step 12: Storage Policies for builder-videos bucket

-- Anyone can view videos
CREATE POLICY "Anyone can view builder videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'builder-videos');

-- Authenticated builders can upload videos
CREATE POLICY "Builders can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'builder-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Builders can update their own videos
CREATE POLICY "Builders can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'builder-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Builders can delete their own videos
CREATE POLICY "Builders can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'builder-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 13: Create function to update video counts
CREATE OR REPLACE FUNCTION update_video_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update likes count
  IF TG_TABLE_NAME = 'video_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.builder_videos 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.builder_videos 
      SET likes_count = GREATEST(likes_count - 1, 0) 
      WHERE id = OLD.video_id;
    END IF;
  END IF;

  -- Update comments count
  IF TG_TABLE_NAME = 'video_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.builder_videos 
      SET comments_count = comments_count + 1 
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.builder_videos 
      SET comments_count = GREATEST(comments_count - 1, 0) 
      WHERE id = OLD.video_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create triggers for automatic count updates
DROP TRIGGER IF EXISTS update_likes_count ON public.video_likes;
CREATE TRIGGER update_likes_count
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION update_video_counts();

DROP TRIGGER IF EXISTS update_comments_count ON public.video_comments;
CREATE TRIGGER update_comments_count
  AFTER INSERT OR DELETE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION update_video_counts();

-- Step 15: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_builder_videos_updated_at ON public.builder_videos;
CREATE TRIGGER update_builder_videos_updated_at
  BEFORE UPDATE ON public.builder_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_comments_updated_at ON public.video_comments;
CREATE TRIGGER update_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 16: Add comments
COMMENT ON TABLE public.builder_videos IS 'Stores video showcases uploaded by professional builders';
COMMENT ON TABLE public.video_likes IS 'Tracks likes on builder videos from authenticated and guest users';
COMMENT ON TABLE public.video_comments IS 'Stores comments on builder videos with support for replies';
COMMENT ON TABLE public.video_views IS 'Analytics data for video views and watch duration';
COMMENT ON COLUMN public.builder_videos.is_featured IS 'Featured videos appear prominently in the gallery';
COMMENT ON COLUMN public.video_comments.parent_comment_id IS 'For threaded replies to comments';















