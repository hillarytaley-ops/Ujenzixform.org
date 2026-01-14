-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX BROKEN UNSPLASH IMAGE URLS IN MATERIALS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Created: January 14, 2026
-- Purpose: Replace broken Unsplash image URLs with working alternatives
-- ═══════════════════════════════════════════════════════════════════════════════

-- Fix broken Tiles image URL (photo-1615971677499-5467cbfe1d3f)
UPDATE materials 
SET image_url = 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=400&h=400&fit=crop&q=80'
WHERE image_url LIKE '%photo-1615971677499-5467cbfe1d3f%';

-- Fix broken Timber image URL (photo-1614963366795-38f92b8d2b4a)
UPDATE materials 
SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80'
WHERE image_url LIKE '%photo-1614963366795-38f92b8d2b4a%';

-- Also fix in admin_material_images table if exists
UPDATE admin_material_images 
SET image_url = 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=400&h=400&fit=crop&q=80'
WHERE image_url LIKE '%photo-1615971677499-5467cbfe1d3f%';

UPDATE admin_material_images 
SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80'
WHERE image_url LIKE '%photo-1614963366795-38f92b8d2b4a%';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed broken Unsplash image URLs in materials and admin_material_images tables';
END $$;

