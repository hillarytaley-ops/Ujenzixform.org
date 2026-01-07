-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   📝 ADD DESCRIPTION COLUMN TO ADMIN MATERIAL IMAGES                                 ║
-- ║                                                                                      ║
-- ║   CREATED: December 26, 2025                                                         ║
-- ║   PURPOSE: Allow admin to add descriptions when uploading product images             ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Add description column to admin_material_images table
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add unit column for pricing display (e.g., "per bag", "per ton")
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unit';

-- Add suggested_price column (optional - admin can suggest a price)
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(12, 2) DEFAULT 0;

-- Update existing records to have empty description
UPDATE admin_material_images 
SET description = '' 
WHERE description IS NULL;

-- Confirm changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_material_images';








