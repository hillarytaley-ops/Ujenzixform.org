-- ====================================================
-- CAMERA MANAGEMENT - Enhance cameras table and RLS
-- ====================================================

-- 1. Ensure cameras table exists with all required columns
CREATE TABLE IF NOT EXISTS public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  stream_url TEXT,
  is_active BOOLEAN DEFAULT true,
  camera_type TEXT DEFAULT 'ip',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add camera_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cameras' 
                 AND column_name = 'camera_type') THEN
    ALTER TABLE public.cameras ADD COLUMN camera_type TEXT DEFAULT 'ip';
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cameras' 
                 AND column_name = 'location') THEN
    ALTER TABLE public.cameras ADD COLUMN location TEXT;
  END IF;

  -- Add stream_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cameras' 
                 AND column_name = 'stream_url') THEN
    ALTER TABLE public.cameras ADD COLUMN stream_url TEXT;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cameras' 
                 AND column_name = 'is_active') THEN
    ALTER TABLE public.cameras ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cameras' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.cameras ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to recreate clean ones
DROP POLICY IF EXISTS "cameras_select" ON cameras;
DROP POLICY IF EXISTS "cameras_insert" ON cameras;
DROP POLICY IF EXISTS "cameras_update" ON cameras;
DROP POLICY IF EXISTS "cameras_delete" ON cameras;
DROP POLICY IF EXISTS "cameras_admin_all" ON cameras;
DROP POLICY IF EXISTS "cameras_authenticated_view" ON cameras;
DROP POLICY IF EXISTS "Anyone can view cameras" ON cameras;
DROP POLICY IF EXISTS "Admin can manage cameras" ON cameras;

-- 5. Create RLS policies

-- All authenticated users can view cameras (for monitoring)
CREATE POLICY "cameras_authenticated_view" ON cameras
FOR SELECT TO authenticated
USING (true);

-- Only admins can insert cameras
CREATE POLICY "cameras_admin_insert" ON cameras
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Only admins can update cameras
CREATE POLICY "cameras_admin_update" ON cameras
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Only admins can delete cameras
CREATE POLICY "cameras_admin_delete" ON cameras
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Grant permissions
GRANT SELECT ON public.cameras TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cameras TO authenticated;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cameras_is_active ON cameras(is_active);
CREATE INDEX IF NOT EXISTS idx_cameras_project_id ON cameras(project_id);
CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras(created_at DESC);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cameras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS cameras_updated_at_trigger ON cameras;
CREATE TRIGGER cameras_updated_at_trigger
BEFORE UPDATE ON cameras
FOR EACH ROW
EXECUTE FUNCTION update_cameras_updated_at();


