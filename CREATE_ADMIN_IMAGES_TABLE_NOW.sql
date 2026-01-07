-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR RIGHT NOW
-- Go to: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/sql/new
-- Paste this ENTIRE script and click RUN
-- ============================================

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

-- Disable RLS so anyone can read/write (simpler for now)
ALTER TABLE admin_material_images DISABLE ROW LEVEL SECURITY;

-- Grant full access
GRANT ALL ON admin_material_images TO authenticated;
GRANT ALL ON admin_material_images TO anon;

-- Verify table was created
SELECT 'SUCCESS! Table created. Now go upload images in Admin Dashboard.' as status;

 



