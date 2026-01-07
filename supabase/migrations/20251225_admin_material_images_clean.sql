-- Admin Material Images Tables - FIXED VERSION
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view admin material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can insert material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can update material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can delete material images" ON admin_material_images;
DROP POLICY IF EXISTS "Anyone can view approved material images" ON approved_material_images;
DROP POLICY IF EXISTS "Admins can manage image approvals" ON approved_material_images;

-- Table 1: Admin uploaded images (IF NOT EXISTS handles already created table)
CREATE TABLE IF NOT EXISTS admin_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Approved supplier images
CREATE TABLE IF NOT EXISTS approved_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id)
);

-- Enable Row Level Security
ALTER TABLE admin_material_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_material_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view admin images
CREATE POLICY "Anyone can view admin material images"
  ON admin_material_images FOR SELECT USING (true);

-- Policy: Admins can insert images (using user_roles table)
CREATE POLICY "Admins can insert material images"
  ON admin_material_images FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Admins can update images (using user_roles table)
CREATE POLICY "Admins can update material images"
  ON admin_material_images FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Admins can delete images (using user_roles table)
CREATE POLICY "Admins can delete material images"
  ON admin_material_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Anyone can view approved images
CREATE POLICY "Anyone can view approved material images"
  ON approved_material_images FOR SELECT USING (true);

-- Policy: Admins can manage approvals (using user_roles table)
CREATE POLICY "Admins can manage image approvals"
  ON approved_material_images FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes (IF NOT EXISTS handles already created indexes)
CREATE INDEX IF NOT EXISTS idx_admin_material_images_category ON admin_material_images(category);
CREATE INDEX IF NOT EXISTS idx_admin_material_images_featured ON admin_material_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_approved_material_images_material_id ON approved_material_images(material_id);

-- Grant permissions
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON approved_material_images TO authenticated;
GRANT SELECT ON admin_material_images TO anon;
GRANT SELECT ON approved_material_images TO anon;
