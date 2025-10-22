-- Create storage buckets for profile images and company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Add image columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add image columns to suppliers table
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Storage policies for profile images
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for company logos
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can upload their company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);