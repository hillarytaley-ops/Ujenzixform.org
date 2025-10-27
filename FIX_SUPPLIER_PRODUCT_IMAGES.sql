-- =====================================================
-- FIX SUPPLIER LOGOS AND PRODUCT IMAGES
-- =====================================================
-- This script ensures all suppliers have logos and all
-- products have images displayed
-- =====================================================

-- Step 1: Enable Storage Buckets
-- Run this in Supabase Dashboard > Storage

-- Create company-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set Storage Policies for Public Access

-- Allow public to view company logos
CREATE POLICY IF NOT EXISTS "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload logos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Allow users to update their own logos
CREATE POLICY IF NOT EXISTS "Users can update own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public to view product images
CREATE POLICY IF NOT EXISTS "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Step 3: Add Sample Supplier Logos (Using UI Avatars API as fallback)

-- Update suppliers table to ensure logo_url column exists
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Update existing suppliers with generated avatar URLs
UPDATE suppliers
SET company_logo_url = 
  'https://ui-avatars.com/api/?name=' || 
  REPLACE(company_name, ' ', '+') || 
  '&size=200&background=' || 
  CASE 
    WHEN id % 6 = 0 THEN '3B82F6' -- Blue
    WHEN id % 6 = 1 THEN 'EF4444' -- Red
    WHEN id % 6 = 2 THEN 'F59E0B' -- Yellow
    WHEN id % 6 = 3 THEN '8B5CF6' -- Purple
    WHEN id % 6 = 4 THEN '10B981' -- Green
    ELSE 'F97316' -- Orange
  END || 
  '&color=ffffff&bold=true'
WHERE company_logo_url IS NULL OR company_logo_url = '';

-- Step 4: Add Sample Material/Product Images

-- Create materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS materials (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  unit_price DECIMAL(10,2),
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add image_url column if it doesn't exist
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update materials with high-quality construction material images from Unsplash

-- Cement products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%cement%' OR category ILIKE '%cement%') 
AND (image_url IS NULL OR image_url = '');

-- Steel/Reinforcement products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%steel%' OR name ILIKE '%iron%' OR name ILIKE '%rebar%' OR category ILIKE '%steel%') 
AND (image_url IS NULL OR image_url = '');

-- Paint products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%paint%' OR category ILIKE '%paint%') 
AND (image_url IS NULL OR image_url = '');

-- Tiles products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%tile%' OR name ILIKE '%ceramic%' OR category ILIKE '%tile%') 
AND (image_url IS NULL OR image_url = '');

-- Roofing/Mabati products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1632472770190-1d0fc8f5f9e6?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%roof%' OR name ILIKE '%mabati%' OR name ILIKE '%sheet%' OR category ILIKE '%roof%') 
AND (image_url IS NULL OR image_url = '');

-- Sand/Aggregate products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1618083707368-b3823daa2726?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%sand%' OR name ILIKE '%aggregate%' OR name ILIKE '%ballast%' OR category ILIKE '%aggregate%') 
AND (image_url IS NULL OR image_url = '');

-- Timber/Wood products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%timber%' OR name ILIKE '%wood%' OR name ILIKE '%plywood%' OR category ILIKE '%timber%') 
AND (image_url IS NULL OR image_url = '');

-- Blocks/Bricks products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%block%' OR name ILIKE '%brick%' OR category ILIKE '%block%') 
AND (image_url IS NULL OR image_url = '');

-- Plumbing products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%pipe%' OR name ILIKE '%plumbing%' OR category ILIKE '%plumbing%') 
AND (image_url IS NULL OR image_url = '');

-- Electrical products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%wire%' OR name ILIKE '%cable%' OR name ILIKE '%electrical%' OR category ILIKE '%electrical%') 
AND (image_url IS NULL OR image_url = '');

-- Hardware/Tools products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%nail%' OR name ILIKE '%screw%' OR name ILIKE '%bolt%' OR name ILIKE '%tool%' OR category ILIKE '%hardware%') 
AND (image_url IS NULL OR image_url = '');

-- Glass products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%glass%' OR name ILIKE '%window%' OR category ILIKE '%glass%') 
AND (image_url IS NULL OR image_url = '');

-- Door products
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1520699697851-3dc68aa3a474?w=400&h=400&fit=crop&q=80'
WHERE (name ILIKE '%door%' OR category ILIKE '%door%') 
AND (image_url IS NULL OR image_url = '');

-- Default construction materials image for any remaining items
UPDATE materials
SET image_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop&q=80'
WHERE image_url IS NULL OR image_url = '';

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_company_logo 
ON suppliers(company_logo_url);

CREATE INDEX IF NOT EXISTS idx_materials_image 
ON materials(image_url);

CREATE INDEX IF NOT EXISTS idx_materials_supplier 
ON materials(supplier_id);

-- Step 6: Create sample suppliers with logos if table is empty
INSERT INTO suppliers (company_name, company_logo_url, business_type, is_verified)
SELECT * FROM (VALUES 
  ('Bamburi Cement', 'https://ui-avatars.com/api/?name=Bamburi+Cement&size=200&background=3B82F6&color=ffffff&bold=true', 'manufacturer', true),
  ('Devki Steel Mills', 'https://ui-avatars.com/api/?name=Devki+Steel&size=200&background=EF4444&color=ffffff&bold=true', 'manufacturer', true),
  ('Crown Paints', 'https://ui-avatars.com/api/?name=Crown+Paints&size=200&background=F59E0B&color=ffffff&bold=true', 'manufacturer', true),
  ('Tile & Carpet Centre', 'https://ui-avatars.com/api/?name=Tile+Carpet&size=200&background=8B5CF6&color=ffffff&bold=true', 'distributor', true),
  ('Mabati Rolling Mills', 'https://ui-avatars.com/api/?name=Mabati+Mills&size=200&background=10B981&color=ffffff&bold=true', 'manufacturer', true),
  ('Homa Lime Company', 'https://ui-avatars.com/api/?name=Homa+Lime&size=200&background=F97316&color=ffffff&bold=true', 'manufacturer', true)
) AS v(company_name, company_logo_url, business_type, is_verified)
WHERE NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1);

-- Step 7: Grant necessary permissions
GRANT SELECT ON suppliers TO anon, authenticated;
GRANT SELECT ON materials TO anon, authenticated;
GRANT INSERT, UPDATE ON suppliers TO authenticated;
GRANT INSERT, UPDATE ON materials TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check suppliers with logos
SELECT 
  id, 
  company_name, 
  company_logo_url,
  CASE 
    WHEN company_logo_url IS NOT NULL AND company_logo_url != '' THEN '✅ Has Logo'
    ELSE '❌ Missing Logo'
  END as logo_status
FROM suppliers
ORDER BY id;

-- Check materials with images
SELECT 
  m.id,
  m.name,
  s.company_name as supplier,
  m.image_url,
  CASE 
    WHEN m.image_url IS NOT NULL AND m.image_url != '' THEN '✅ Has Image'
    ELSE '❌ Missing Image'
  END as image_status
FROM materials m
LEFT JOIN suppliers s ON m.supplier_id = s.id
ORDER BY s.company_name, m.name;

-- Count statistics
SELECT 
  'Suppliers' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN company_logo_url IS NOT NULL AND company_logo_url != '' THEN 1 END) as with_images,
  COUNT(CASE WHEN company_logo_url IS NULL OR company_logo_url = '' THEN 1 END) as without_images
FROM suppliers
UNION ALL
SELECT 
  'Products' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as with_images,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as without_images
FROM materials;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- All suppliers and products should now have images!
-- Logos: UI Avatars API (colorful generated avatars)
-- Products: Unsplash (real construction material photos)
-- =====================================================

