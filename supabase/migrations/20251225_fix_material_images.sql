-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🔒 PROTECTED MIGRATION - FIX MATERIAL IMAGES                                       ║
-- ║                                                                                      ║
-- ║   ⚠️⚠️⚠️  CRITICAL DATABASE MIGRATION - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️         ║
-- ║                                                                                      ║
-- ║   DATE: December 25, 2025                                                            ║
-- ║   PURPOSE: Remove incorrect surveillance/camera image URLs from materials table      ║
-- ║            and set proper category-based default images                              ║
-- ║                                                                                      ║
-- ║   BLOCKED IMAGE IDS (Unsplash):                                                      ║
-- ║   - photo-1590856029826-c7a73142bbf1 (surveillance camera)                           ║
-- ║   - photo-1587293852726-70cdb56c2866 (security camera)                               ║
-- ║                                                                                      ║
-- ║   BLOCKED PATTERNS:                                                                  ║
-- ║   - surveillance, camera, cctv, monitoring, webcam, ipcam, nvr, dvr                  ║
-- ║                                                                                      ║
-- ║   🚫 DO NOT:                                                                          ║
-- ║   - Remove blocked image IDs without frontend code update                            ║
-- ║   - Modify the category image mappings                                               ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Clear all image_url values that contain surveillance camera images or invalid URLs
-- This allows the frontend to use category-based fallback images instead
UPDATE materials
SET image_url = NULL
WHERE image_url IS NOT NULL
AND (
  -- Clear specific Unsplash surveillance camera images
  image_url LIKE '%photo-1590856029826-c7a73142bbf1%'
  OR image_url LIKE '%photo-1587293852726-70cdb56c2866%'
  -- Clear URLs that contain surveillance/camera related terms
  OR image_url ILIKE '%surveillance%'
  OR image_url ILIKE '%camera%'
  OR image_url ILIKE '%cctv%'
  OR image_url ILIKE '%security%camera%'
  OR image_url ILIKE '%monitoring%'
  -- Clear any URLs that are not valid image URLs
  OR image_url NOT LIKE 'http%'
  -- Clear any broken placeholder URLs
  OR image_url ILIKE '%placehold%'
  OR image_url ILIKE '%placeholder%'
);

-- Set default category-based image URLs for materials that have no image
-- Using local public folder images that exist in the project
UPDATE materials
SET image_url = CASE 
  WHEN LOWER(category) = 'cement' THEN '/cement.png'
  WHEN LOWER(category) = 'steel' THEN '/steel.png'
  WHEN LOWER(category) = 'tiles' THEN '/tiles.png'
  WHEN LOWER(category) = 'paint' THEN '/paint.png'
  WHEN LOWER(category) = 'timber' THEN '/timber.png'
  WHEN LOWER(category) = 'hardware' THEN '/hardware.png'
  WHEN LOWER(category) = 'plumbing' THEN '/plumbing.png'
  WHEN LOWER(category) = 'electrical' THEN '/electrical.png'
  WHEN LOWER(category) = 'aggregates' THEN '/aggregates.png'
  WHEN LOWER(category) = 'roofing' THEN '/roofing.png'
  WHEN LOWER(category) = 'insulation' THEN '/insulation.png'
  WHEN LOWER(category) = 'tools' THEN '/tools.jpg'
  WHEN LOWER(category) = 'stone' THEN '/stone.png'
  WHEN LOWER(category) = 'sand' THEN '/sand.png'
  WHEN LOWER(category) = 'plywood' THEN '/plywood.png'
  WHEN LOWER(category) = 'doors' THEN '/doors.png'
  WHEN LOWER(category) = 'wire' THEN '/wire.png'
  WHEN LOWER(category) IN ('iron sheets', 'mabati', 'roofing sheets') THEN '/iron-sheets.png'
  WHEN LOWER(category) = 'blocks' THEN '/blocks.png'
  WHEN LOWER(category) = 'glass' THEN '/glass.png'
  WHEN LOWER(category) = 'windows' THEN '/windows.png'
  ELSE NULL
END
WHERE image_url IS NULL;

-- Log the update for verification
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM materials WHERE image_url IS NOT NULL;
  RAISE NOTICE 'Materials with images after update: %', updated_count;
END $$;

