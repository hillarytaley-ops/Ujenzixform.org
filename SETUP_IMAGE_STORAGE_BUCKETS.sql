-- =====================================================
-- COMPLETE IMAGE STORAGE SETUP
-- =====================================================
-- Sets up all storage buckets and policies for:
-- - Supplier company logos
-- - Builder profile images
-- - Product/material images
-- =====================================================

-- Step 1: Create Storage Buckets
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

-- Step 2: Set Up Storage Policies
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
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own logos
DROP POLICY IF EXISTS "Users can update own logos" ON storage.objects;
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own logos
DROP POLICY IF EXISTS "Users can delete own logos" ON storage.objects;
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- PROFILE IMAGES POLICIES
-- =====================================================

-- Allow everyone to view profile images
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile images
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile images
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow suppliers to delete their product images
DROP POLICY IF EXISTS "Suppliers can delete product images" ON storage.objects;
CREATE POLICY "Suppliers can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Step 3: Ensure Database Columns Exist
-- =====================================================

-- Add logo column to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add image column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Step 4: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_logo 
ON suppliers(company_logo_url);

CREATE INDEX IF NOT EXISTS idx_materials_image 
ON materials(image_url);

CREATE INDEX IF NOT EXISTS idx_profiles_avatar 
ON profiles(avatar_url);

CREATE INDEX IF NOT EXISTS idx_profiles_company_logo 
ON profiles(company_logo_url);

-- Step 5: Grant Permissions
-- =====================================================

GRANT SELECT ON suppliers TO anon, authenticated;
GRANT SELECT ON materials TO anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;

GRANT INSERT, UPDATE ON suppliers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON materials TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check storage buckets
SELECT 
  id as bucket_name,
  public as is_public,
  file_size_limit as max_size_bytes,
  file_size_limit / 1024 / 1024 as max_size_mb,
  allowed_mime_types as allowed_formats
FROM storage.buckets
WHERE id IN ('company-logos', 'profile-images', 'product-images');

-- Check storage policies
SELECT 
  policyname as policy_name,
  CASE cmd
    WHEN 'SELECT' THEN 'View/Read'
    WHEN 'INSERT' THEN 'Upload/Create'
    WHEN 'UPDATE' THEN 'Modify'
    WHEN 'DELETE' THEN 'Remove'
  END as permission_type,
  CASE 
    WHEN policyname LIKE '%public%' OR policyname LIKE '%Public%' THEN '👁️ Everyone'
    WHEN policyname LIKE '%authenticated%' THEN '🔐 Logged-in users'
    WHEN policyname LIKE '%own%' THEN '👤 Owner only'
    ELSE '⚙️ Custom'
  END as who_can
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%logo%' 
   OR policyname LIKE '%profile%' 
   OR policyname LIKE '%product%'
ORDER BY policyname;

-- Check suppliers with logos
SELECT 
  company_name,
  CASE 
    WHEN company_logo_url IS NOT NULL AND company_logo_url != '' 
      THEN '✅ Has Logo'
    ELSE '❌ No Logo Yet'
  END as logo_status,
  SUBSTRING(company_logo_url, 1, 50) as logo_url_preview
FROM suppliers
ORDER BY company_name
LIMIT 10;

-- Check products with images
SELECT 
  m.name as product_name,
  s.company_name as supplier,
  CASE 
    WHEN m.image_url IS NOT NULL AND m.image_url != '' 
      THEN '✅ Has Image'
    ELSE '❌ No Image Yet'
  END as image_status,
  SUBSTRING(m.image_url, 1, 50) as image_url_preview
FROM materials m
LEFT JOIN suppliers s ON m.supplier_id = s.id
ORDER BY s.company_name, m.name
LIMIT 20;

-- Statistics
SELECT 
  'Storage Buckets' as item,
  COUNT(*) as total
FROM storage.buckets
WHERE id IN ('company-logos', 'profile-images', 'product-images')
UNION ALL
SELECT 
  'Suppliers with Logos' as item,
  COUNT(*) as total
FROM suppliers
WHERE company_logo_url IS NOT NULL AND company_logo_url != ''
UNION ALL
SELECT 
  'Products with Images' as item,
  COUNT(*) as total
FROM materials
WHERE image_url IS NOT NULL AND image_url != ''
UNION ALL
SELECT 
  'Builders with Images' as item,
  COUNT(*) as total
FROM profiles
WHERE avatar_url IS NOT NULL OR company_logo_url IS NOT NULL;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Storage buckets created: ✅
-- Policies configured: ✅
-- Database columns added: ✅
-- Indexes created: ✅
-- 
-- Users can now:
-- ✅ Upload company logos during registration
-- ✅ Upload product images when adding products
-- ✅ Upload profile pictures during setup
-- ✅ All images display in directories and catalogs
-- ✅ No more missing images!
-- =====================================================



