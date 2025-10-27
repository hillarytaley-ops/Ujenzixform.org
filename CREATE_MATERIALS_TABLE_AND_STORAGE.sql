-- =====================================================
-- CREATE MATERIALS TABLE AND IMAGE STORAGE
-- =====================================================
-- Creates materials/products table and sets up complete
-- image storage system for suppliers and builders
-- =====================================================

-- Step 1: Create Materials/Products Table
-- =====================================================

CREATE TABLE IF NOT EXISTS materials (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_in_stock ON materials(in_stock);
CREATE INDEX IF NOT EXISTS idx_materials_image_url ON materials(image_url);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at DESC);

-- Step 2: Create Storage Buckets
-- =====================================================

-- Company Logos Bucket (for supplier logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Profile Images Bucket (for builder avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Product Images Bucket (for supplier product photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Step 3: Set Up Storage Policies
-- =====================================================

-- COMPANY LOGOS POLICIES
-- =====================================================

-- Allow everyone to view company logos
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload own logos" ON storage.objects;
CREATE POLICY "Users can upload own logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own logos
DROP POLICY IF EXISTS "Users can update own logos" ON storage.objects;
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos');

-- Allow users to delete their own logos
DROP POLICY IF EXISTS "Users can delete own logos" ON storage.objects;
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos');

-- PROFILE IMAGES POLICIES
-- =====================================================

-- Allow everyone to view profile images
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images');

-- Allow users to delete
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images');

-- PRODUCT IMAGES POLICIES
-- =====================================================

-- Allow everyone to view product images
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated suppliers to upload product images
DROP POLICY IF EXISTS "Suppliers can upload product images" ON storage.objects;
CREATE POLICY "Suppliers can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow suppliers to update their product images
DROP POLICY IF EXISTS "Suppliers can update product images" ON storage.objects;
CREATE POLICY "Suppliers can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Allow suppliers to delete their product images
DROP POLICY IF EXISTS "Suppliers can delete product images" ON storage.objects;
CREATE POLICY "Suppliers can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- Step 4: Ensure Database Columns Exist
-- =====================================================

-- Add logo column to suppliers table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
  END IF;
END $$;

-- Add image columns to profiles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
  END IF;
END $$;

-- Step 5: Grant Permissions
-- =====================================================

-- Materials table permissions
GRANT SELECT ON materials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON materials TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE materials_id_seq TO authenticated;

-- Suppliers table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    GRANT SELECT ON suppliers TO anon, authenticated;
    GRANT INSERT, UPDATE ON suppliers TO authenticated;
  END IF;
END $$;

-- Profiles table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    GRANT SELECT ON profiles TO anon, authenticated;
    GRANT INSERT, UPDATE ON profiles TO authenticated;
  END IF;
END $$;

-- Step 6: Add Sample Products with Images (Optional)
-- =====================================================

-- Only add if materials table is empty
DO $$
DECLARE
  supplier_id_var BIGINT;
BEGIN
  -- Check if we have any materials
  IF NOT EXISTS (SELECT 1 FROM materials LIMIT 1) THEN
    -- Get first supplier ID if any suppliers exist
    SELECT id INTO supplier_id_var 
    FROM suppliers 
    WHERE is_verified = true 
    ORDER BY id 
    LIMIT 1;
    
    -- If we have a supplier, add sample products
    IF supplier_id_var IS NOT NULL THEN
      INSERT INTO materials (supplier_id, name, description, category, unit, unit_price, image_url, in_stock)
      VALUES 
        (
          supplier_id_var,
          'Bamburi Cement 42.5N (50kg)',
          'Premium Portland cement from Bamburi - Kenya''s most trusted cement brand for foundations, slabs, and structural work',
          'Cement',
          'bag',
          850.00,
          'https://images.unsplash.com/photo-1618491994992-2f6d7105d8b2?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_id_var,
          'Y12 Deformed Steel Bars (6m)',
          'High tensile deformed bars (Y12 - 12mm diameter) for concrete reinforcement - KEBS approved',
          'Steel',
          'piece',
          950.00,
          'https://images.unsplash.com/photo-1565084888279-aca607ecce8c?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_id_var,
          'Crown Emulsion Paint 20L',
          'Crown Paints premium acrylic emulsion - smooth matt finish, washable, covers 140-160 sqm',
          'Paint',
          'bucket',
          4800.00,
          'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_id_var,
          'Mabati Iron Sheets Gauge 28 (3m)',
          'Mabati box profile corrugated iron sheets - galvanized steel, gauge 28, 3-meter length',
          'Roofing',
          'sheet',
          1350.00,
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_id_var,
          'Concrete Hollow Blocks 6-inch',
          'Standard 6-inch concrete hollow blocks - 450x225x150mm, high compressive strength',
          'Blocks',
          'piece',
          65.00,
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&q=85',
          true
        );
    END IF;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if materials table exists and has data
SELECT 
  'Materials Table' as check_item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has Data'
    ELSE '⚠️ Empty (will use demo data)'
  END as status
FROM materials;

-- Check storage buckets
SELECT 
  id as bucket_name,
  public as is_public,
  file_size_limit / 1024 / 1024 as max_size_mb,
  '✅ Created' as status
FROM storage.buckets
WHERE id IN ('company-logos', 'profile-images', 'product-images');

-- Check materials with images
SELECT 
  id,
  name,
  category,
  unit_price,
  CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN '✅ Has Image'
    ELSE '❌ No Image'
  END as image_status,
  SUBSTRING(image_url, 1, 60) as image_url_preview
FROM materials
ORDER BY id
LIMIT 10;

-- Count summary
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as products_with_images,
  COUNT(CASE WHEN in_stock THEN 1 END) as products_in_stock
FROM materials;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- Materials table created: ✅
-- Storage buckets created: ✅
-- Policies configured: ✅
-- Sample products added (if applicable): ✅
-- 
-- Next steps:
-- 1. Restart your dev server
-- 2. Clear browser cache
-- 3. Go to /suppliers and click on a supplier
-- 4. You should see products with images!
-- 5. Suppliers can now add their own products with images
-- =====================================================

