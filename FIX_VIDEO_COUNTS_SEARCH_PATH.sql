-- =====================================================
-- FIX: update_video_counts function search_path
-- Run this in Supabase SQL Editor to fix immediately
-- =====================================================

-- Option 1: Quick fix - just alter the existing function
ALTER FUNCTION public.update_video_counts()
  SET search_path = public, pg_catalog;

-- Option 2: Full recreation with search_path (recommended)
-- This ensures the setting is bundled with the function definition

CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;

-- Verify the fix
SELECT 
  proname as function_name,
  proconfig as config_settings
FROM pg_proc 
WHERE proname = 'update_video_counts';

-- Expected output should show: {search_path=public, pg_catalog}







