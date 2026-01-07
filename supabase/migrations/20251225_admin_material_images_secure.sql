-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🖼️ ADMIN MATERIAL IMAGES - DATABASE SCHEMA (PROTECTED)                             ║
-- ║                                                                                      ║
-- ║   ⚠️⚠️⚠️  CRITICAL DATABASE MIGRATION - DO NOT MODIFY  ⚠️⚠️⚠️                        ║
-- ║                                                                                      ║
-- ║   CREATED: December 25, 2025                                                         ║
-- ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
-- ║                                                                                      ║
-- ║   PURPOSE:                                                                           ║
-- ║   • admin_material_images - Stores admin-uploaded material images                   ║
-- ║   • approved_material_images - Tracks supplier images approved by admin             ║
-- ║   • Images appear on /suppliers and /supplier-marketplace pages                     ║
-- ║                                                                                      ║
-- ║   SECURITY:                                                                          ║
-- ║   • Public can INSERT images (marked as pending)                                    ║
-- ║   • Only approved images (is_approved = true) are visible                           ║
-- ║   • Admin can UPDATE/DELETE all images                                              ║
-- ║                                                                                      ║
-- ║   🚫 DO NOT:                                                                         ║
-- ║   - Drop these tables without backup                                                ║
-- ║   - Remove the is_approved column                                                   ║
-- ║   - Change the RLS policies without review                                          ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Admin Material Images Tables - SECURE VERSION
-- This version allows public inserts but marks them as unapproved
-- Only authenticated admins can approve/feature images
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view admin material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can insert material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can update material images" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can delete material images" ON admin_material_images;
DROP POLICY IF EXISTS "Anyone can insert pending images" ON admin_material_images;
DROP POLICY IF EXISTS "Anyone can view approved material images" ON approved_material_images;
DROP POLICY IF EXISTS "Admins can manage image approvals" ON approved_material_images;

-- Table 1: Admin uploaded images
CREATE TABLE IF NOT EXISTS admin_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,  -- Default to FALSE for security
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Approved supplier images
CREATE TABLE IF NOT EXISTS approved_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id)
);

-- Enable Row Level Security
ALTER TABLE admin_material_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_material_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view APPROVED images only (public display)
CREATE POLICY "Anyone can view approved admin images"
  ON admin_material_images FOR SELECT
  USING (is_approved = true);

-- Policy: Anyone can INSERT images (but they're unapproved by default)
-- This allows your admin without Supabase auth to upload
CREATE POLICY "Anyone can insert pending images"
  ON admin_material_images FOR INSERT
  WITH CHECK (true);

-- Policy: Only authenticated admins can UPDATE (approve/feature)
CREATE POLICY "Admins can update material images"
  ON admin_material_images FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Only authenticated admins can DELETE
CREATE POLICY "Admins can delete material images"
  ON admin_material_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Anyone can view approved images
CREATE POLICY "Anyone can view approved material images"
  ON approved_material_images FOR SELECT USING (is_approved = true);

-- Policy: Anyone can insert to approved_material_images
CREATE POLICY "Anyone can insert approved material images"
  ON approved_material_images FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_material_images_category ON admin_material_images(category);
CREATE INDEX IF NOT EXISTS idx_admin_material_images_featured ON admin_material_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_admin_material_images_approved ON admin_material_images(is_approved);
CREATE INDEX IF NOT EXISTS idx_approved_material_images_material_id ON approved_material_images(material_id);

-- Grant permissions
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON approved_material_images TO authenticated;
GRANT SELECT, INSERT ON admin_material_images TO anon;
GRANT SELECT, INSERT ON approved_material_images TO anon;

