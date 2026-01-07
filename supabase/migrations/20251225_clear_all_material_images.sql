-- ================================================================
-- CLEAR ALL MATERIAL IMAGES
-- Migration: 20251225_clear_all_material_images.sql
-- Date: December 25, 2025
-- Purpose: Remove all image URLs from materials table
-- ================================================================

-- Clear ALL image URLs from materials table
-- This removes any images that were added by the system
UPDATE materials
SET image_url = NULL
WHERE image_url IS NOT NULL;

-- Log the change
DO $$
DECLARE
  cleared_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cleared_count FROM materials WHERE image_url IS NULL;
  RAISE NOTICE 'Cleared image URLs. Total materials with NULL image_url: %', cleared_count;
END $$;








