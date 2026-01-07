-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR RIGHT NOW
-- Go to: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/sql/new
-- Paste this ENTIRE script and click RUN
-- ============================================

-- Create the materials table (for supplier products)
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for now (simpler)
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON materials TO authenticated;
GRANT ALL ON materials TO anon;

-- Create the admin_material_images table
CREATE TABLE IF NOT EXISTS admin_material_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'unit',
  suggested_price DECIMAL(12, 2) DEFAULT 0,
  image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE admin_material_images DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON admin_material_images TO anon;

-- Verify tables were created
SELECT 'SUCCESS! Both tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('materials', 'admin_material_images');





