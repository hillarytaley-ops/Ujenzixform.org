-- ================================================================
-- CLEAR ALL MATERIAL IMAGES - FINAL CLEANUP
-- Migration: 20251225_clear_material_images_final.sql
-- Date: December 25, 2025
-- Purpose: Clear ALL image URLs from materials table so user can upload fresh images
-- ================================================================

-- Clear ALL image URLs from materials table
UPDATE materials
SET image_url = NULL
WHERE image_url IS NOT NULL;

-- Log the change
DO $$
DECLARE
  total_count INTEGER;
  cleared_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM materials;
  SELECT COUNT(*) INTO cleared_count FROM materials WHERE image_url IS NULL;
  RAISE NOTICE 'Total materials: %. Materials with cleared image_url: %', total_count, cleared_count;
END $$;

-- Also update the product-images bucket to accept all common image formats
-- Note: This needs to be done via Supabase dashboard or API, but we document it here
COMMENT ON TABLE materials IS 'Material images cleared on December 25, 2025. Users can now upload fresh images.';








