-- Fix: Set deterministic search_path for update_video_counts function
-- This addresses the security warning about role-mutable search_path
-- The function is SECURITY DEFINER, so it's especially important to set search_path

-- Recreate the function with explicit search_path setting
CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Update likes count (using fully-qualified table names)
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

  -- Update comments count (using fully-qualified table names)
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

-- Also fix update_updated_at_column if it exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_video_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_video_counts() IS 'Updates likes_count and comments_count on builder_videos table. Has fixed search_path for security.';







