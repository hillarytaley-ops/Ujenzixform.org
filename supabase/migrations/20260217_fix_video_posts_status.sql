-- ============================================================
-- Fix Video Posts Status
-- Sets all video posts to 'pending' status for admin approval
-- Created: February 17, 2026
-- ============================================================

-- Update all video posts that have 'active' status to 'pending'
-- This ensures all videos require admin approval
UPDATE public.builder_posts
SET status = 'pending'
WHERE video_url IS NOT NULL
  AND status = 'active';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % video posts to pending status', updated_count;
END $$;
