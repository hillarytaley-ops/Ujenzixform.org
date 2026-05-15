-- Keep builder_videos.views_count in sync with video_views rows (analytics inserts)
-- and backfill from existing video_views so counts survive refetch/navigation.

CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
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

  IF TG_TABLE_NAME = 'video_views' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.builder_videos
      SET views_count = views_count + 1
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.builder_videos
      SET views_count = GREATEST(views_count - 1, 0)
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

COMMENT ON FUNCTION public.update_video_counts() IS
  'Updates likes_count, comments_count, and views_count on builder_videos from video_likes, video_comments, and video_views.';

DROP TRIGGER IF EXISTS update_views_count ON public.video_views;
CREATE TRIGGER update_views_count
  AFTER INSERT OR DELETE ON public.video_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_counts();

-- Align denormalized counts with actual video_views rows (one-time repair + idempotent).
UPDATE public.builder_videos v
SET views_count = (
  SELECT COUNT(*)::int
  FROM public.video_views vv
  WHERE vv.video_id = v.id
);
