-- Admin Material Images Tables - NO RLS VERSION
-- This version disables RLS since the admin uses a custom authentication system
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view admin material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can insert material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can update material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can delete material images" ON admin_material_images;
DROP POLICY IF EXISTS "Anyone can view approved material images" ON approved_material_images;
DROP POLICY IF EXISTS "Admins can manage image approvals" ON approved_material_images;

-- Table 1: Admin uploaded images
CREATE TABLE IF NOT EXISTS admin_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  uploaded_by UUID,  -- Removed foreign key constraint for flexibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Approved supplier images
CREATE TABLE IF NOT EXISTS approved_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,  -- Removed foreign key constraint for flexibility
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id)
);

-- DISABLE Row Level Security (allows all operations from authenticated clients)
ALTER TABLE admin_material_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE approved_material_images DISABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_material_images_category ON admin_material_images(category);
CREATE INDEX IF NOT EXISTS idx_admin_material_images_featured ON admin_material_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_approved_material_images_material_id ON approved_material_images(material_id);

-- Grant full permissions
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON approved_material_images TO authenticated;
GRANT ALL ON admin_material_images TO anon;
GRANT ALL ON approved_material_images TO anon;








