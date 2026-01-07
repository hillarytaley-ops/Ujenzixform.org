-- Storage Policies for Admin Material Images
-- Run this in Supabase SQL Editor AFTER the admin_material_images table migration

-- First, create the material-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-images', 'material-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies on material-images bucket (if any)
DROP POLICY IF EXISTS "Anyone can view material images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload material images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update material images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete material images storage" ON storage.objects;

-- Policy: Anyone can view images in material-images bucket
CREATE POLICY "Anyone can view material images"
ON storage.objects FOR SELECT
USING (bucket_id = 'material-images');

-- Policy: Admins can upload to material-images bucket
CREATE POLICY "Admins can upload material images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'material-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can update in material-images bucket
CREATE POLICY "Admins can update material images storage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'material-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can delete from material-images bucket
CREATE POLICY "Admins can delete material images storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'material-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Also add admin policies to product-images bucket (fallback)
-- Drop existing admin policies first
DROP POLICY IF EXISTS "Admins can upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from product-images" ON storage.objects;

-- Policy: Admins can upload to product-images bucket
CREATE POLICY "Admins can upload to product-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can update in product-images bucket
CREATE POLICY "Admins can update product-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can delete from product-images bucket
CREATE POLICY "Admins can delete from product-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);








