-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD MULTI-ANGLE IMAGES SUPPORT TO ADMIN_MATERIAL_IMAGES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Created: January 14, 2026
-- Purpose: Allow storing multiple angle images (front, back, sides, etc.) for each material
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add additional_images column to store array of image URLs (base64 data URLs)
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN admin_material_images.additional_images IS 'Array of additional angle images (back, sides, top, bottom, detail, packaging) stored as base64 data URLs';

-- Create index for faster queries on materials with multiple images
CREATE INDEX IF NOT EXISTS idx_admin_material_images_has_additional 
ON admin_material_images ((additional_images IS NOT NULL));

