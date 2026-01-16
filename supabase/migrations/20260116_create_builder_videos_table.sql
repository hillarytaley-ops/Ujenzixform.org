-- Create builder_videos table for video submissions from builders
-- This table stores videos uploaded by professional builders and private clients

CREATE TABLE IF NOT EXISTS public.builder_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.builder_videos ENABLE ROW LEVEL SECURITY;

-- Policies
-- Builders can view their own videos
CREATE POLICY "builders_view_own_videos" ON public.builder_videos
  FOR SELECT USING (auth.uid() = builder_id);

-- Builders can insert their own videos
CREATE POLICY "builders_insert_own_videos" ON public.builder_videos
  FOR INSERT WITH CHECK (auth.uid() = builder_id);

-- Builders can update their own pending videos
CREATE POLICY "builders_update_own_pending_videos" ON public.builder_videos
  FOR UPDATE USING (auth.uid() = builder_id AND status = 'pending');

-- Admins can view all videos
CREATE POLICY "admins_view_all_videos" ON public.builder_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all videos (for approval/rejection)
CREATE POLICY "admins_update_all_videos" ON public.builder_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_builder_videos_builder_id ON public.builder_videos(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_videos_status ON public.builder_videos(status);
CREATE INDEX IF NOT EXISTS idx_builder_videos_created_at ON public.builder_videos(created_at DESC);

-- Add comment
COMMENT ON TABLE public.builder_videos IS 'Videos uploaded by builders for project showcases and reviews';

