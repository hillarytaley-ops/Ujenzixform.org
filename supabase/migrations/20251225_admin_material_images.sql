-- ============================================================================
-- Admin Material Images Table
-- ============================================================================
-- This table stores images uploaded by admin for display on the suppliers
-- marketplace front page. Admins can also approve/feature supplier-uploaded images.
-- ============================================================================

-- Create admin_material_images table
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

-- Create approved_material_images table for tracking supplier image approvals
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

-- Enable RLS
ALTER TABLE admin_material_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_material_images ENABLE ROW LEVEL SECURITY;

-- Policies for admin_material_images
-- Anyone can view approved images
CREATE POLICY "Anyone can view admin material images"
  ON admin_material_images
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert material images"
  ON admin_material_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update material images"
  ON admin_material_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete material images"
  ON admin_material_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for approved_material_images
-- Anyone can view approved images
CREATE POLICY "Anyone can view approved material images"
  ON approved_material_images
  FOR SELECT
  USING (true);

-- Only admins can manage approvals
CREATE POLICY "Admins can manage image approvals"
  ON approved_material_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_material_images_category 
  ON admin_material_images(category);
CREATE INDEX IF NOT EXISTS idx_admin_material_images_featured 
  ON admin_material_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_approved_material_images_material_id 
  ON approved_material_images(material_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_material_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_material_images_updated_at
  BEFORE UPDATE ON admin_material_images
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_material_images_updated_at();

-- Grant permissions
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON approved_material_images TO authenticated;
GRANT SELECT ON admin_material_images TO anon;
GRANT SELECT ON approved_material_images TO anon;








