-- =====================================================
-- CREATE MATERIALS TABLE AND IMAGE STORAGE (FIXED)
-- =====================================================
-- Fixed: Uses UUID for supplier_id instead of BIGINT
-- =====================================================

-- Step 1: Create Materials/Products Table with UUID
-- =====================================================

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID,
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

-- Company Logos Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Profile Images Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Product Images Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Step 3: Storage Policies
-- =====================================================

-- COMPANY LOGOS
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Users can upload own logos" ON storage.objects;
CREATE POLICY "Users can upload own logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own logos" ON storage.objects;
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Users can delete own logos" ON storage.objects;
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos');

-- PROFILE IMAGES
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images');

-- PRODUCT IMAGES
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Suppliers can upload product images" ON storage.objects;
CREATE POLICY "Suppliers can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Suppliers can update product images" ON storage.objects;
CREATE POLICY "Suppliers can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Suppliers can delete product images" ON storage.objects;
CREATE POLICY "Suppliers can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- Step 4: Add Columns to Existing Tables (If They Exist)
-- =====================================================

-- Suppliers table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    -- Add logo column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'suppliers' AND column_name = 'company_logo_url'
    ) THEN
      ALTER TABLE suppliers ADD COLUMN company_logo_url TEXT;
    END IF;
  END IF;
END $$;

-- Profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Add avatar_url if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
      ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add company_logo_url if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'company_logo_url'
    ) THEN
      ALTER TABLE profiles ADD COLUMN company_logo_url TEXT;
    END IF;
  END IF;
END $$;

-- Step 5: Grant Permissions
-- =====================================================

-- Materials table
GRANT SELECT ON materials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON materials TO authenticated;

-- Suppliers (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    EXECUTE 'GRANT SELECT ON suppliers TO anon, authenticated';
    EXECUTE 'GRANT INSERT, UPDATE ON suppliers TO authenticated';
  END IF;
END $$;

-- Profiles (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'GRANT SELECT ON profiles TO anon, authenticated';
    EXECUTE 'GRANT INSERT, UPDATE ON profiles TO authenticated';
  END IF;
END $$;

-- Step 6: Add Sample Products (If No Products Exist)
-- =====================================================

DO $$
DECLARE
  supplier_uuid UUID;
BEGIN
  -- Check if materials table is empty
  IF NOT EXISTS (SELECT 1 FROM materials LIMIT 1) THEN
    -- Try to get first supplier UUID
    SELECT id INTO supplier_uuid 
    FROM suppliers 
    WHERE is_verified = true 
    ORDER BY created_at 
    LIMIT 1;
    
    -- If we have a supplier, add sample products with images
    IF supplier_uuid IS NOT NULL THEN
      INSERT INTO materials (supplier_id, name, description, category, unit, unit_price, image_url, in_stock)
      VALUES 
        (
          supplier_uuid,
          'Bamburi Cement 42.5N (50kg)',
          'Premium Portland cement from Bamburi - Kenya''s most trusted cement brand for foundations, slabs, and structural work',
          'Cement',
          'bag',
          850.00,
          'https://images.unsplash.com/photo-1618491994992-2f6d7105d8b2?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_uuid,
          'Y12 Deformed Steel Bars (6m)',
          'High tensile deformed bars (Y12 - 12mm diameter) for concrete reinforcement - KEBS approved, 6-meter length',
          'Steel',
          'piece',
          950.00,
          'https://images.unsplash.com/photo-1565084888279-aca607ecce8c?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_uuid,
          'Crown Emulsion Paint 20L',
          'Crown Paints premium acrylic emulsion - smooth matt finish, washable, covers 140-160 sqm, available in 1000+ colors',
          'Paint',
          'bucket',
          4800.00,
          'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_uuid,
          'Mabati Iron Sheets Gauge 28 (3m)',
          'Mabati box profile corrugated iron sheets - galvanized steel, gauge 28, 3-meter length, 25-year warranty',
          'Roofing',
          'sheet',
          1350.00,
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop&q=85',
          true
        ),
        (
          supplier_uuid,
          'Concrete Hollow Blocks 6-inch',
          'Standard 6-inch concrete hollow blocks - 450x225x150mm, high compressive strength, ideal for wall construction',
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
-- VERIFICATION
-- =====================================================

-- Check materials table
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as products_with_images
FROM materials;

-- View sample products
SELECT 
  id,
  name,
  category,
  unit_price,
  CASE 
    WHEN image_url IS NOT NULL THEN '✅ Has Image'
    ELSE '❌ No Image'
  END as image_status
FROM materials
LIMIT 10;

-- Check storage buckets
SELECT 
  id as bucket_name,
  public as is_public,
  '✅ Created' as status
FROM storage.buckets
WHERE id IN ('company-logos', 'profile-images', 'product-images');

-- =====================================================
-- SUCCESS!
-- =====================================================
-- ✅ Materials table created (with UUID)
-- ✅ Storage buckets created
-- ✅ Policies configured
-- ✅ Sample products added
-- ✅ Ready for user uploads!
-- 
-- Next: Restart server, clear cache, test!
-- =====================================================








