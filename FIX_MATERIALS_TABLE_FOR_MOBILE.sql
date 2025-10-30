-- ================================================================
-- FIX MATERIALS TABLE FOR MOBILE ACCESS
-- ================================================================
-- This script ensures the materials table exists, has proper RLS,
-- and contains demo data for testing on mobile devices
-- ================================================================

-- Step 1: Create materials table if it doesn't exist
-- ================================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON public.materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_in_stock ON public.materials(in_stock);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON public.materials(created_at DESC);

-- Step 2: Enable RLS (Row Level Security)
-- ================================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies and recreate them
-- ================================================================
DROP POLICY IF EXISTS "materials_public_read" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_update" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_delete" ON public.materials;
DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;

-- PUBLIC READ ACCESS - Everyone can view materials catalog
CREATE POLICY "materials_public_read"
ON public.materials
FOR SELECT
TO public
USING (true);

-- SUPPLIER INSERT ACCESS - Suppliers can add their own materials
CREATE POLICY "materials_supplier_insert"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- SUPPLIER UPDATE ACCESS - Suppliers can update their own materials
CREATE POLICY "materials_supplier_update"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
)
WITH CHECK (
  supplier_id = auth.uid()
);

-- SUPPLIER DELETE ACCESS - Suppliers can delete their own materials
CREATE POLICY "materials_supplier_delete"
ON public.materials
FOR DELETE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- ADMIN FULL ACCESS - Admins can manage all materials
CREATE POLICY "materials_admin_all"
ON public.materials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Step 4: Insert demo materials for testing
-- ================================================================
-- Note: We'll use a demo UUID for supplier_id since we don't have real suppliers yet
-- In production, this would be actual supplier user IDs

DO $$
DECLARE
  demo_supplier_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Delete existing demo materials
  DELETE FROM public.materials WHERE supplier_id = demo_supplier_id;
  
  -- Insert Kenyan construction materials
  INSERT INTO public.materials (supplier_id, name, description, category, unit, unit_price, image_url, in_stock)
  VALUES 
    -- Cement
    (demo_supplier_id, 'Bamburi Cement 42.5N (50kg)', 'Premium Portland cement from Bamburi - Kenya''s most trusted cement brand', 'Cement', 'bag', 850, 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'East African Portland Cement 42.5R', 'High strength rapid hardening cement - ideal for fast construction', 'Cement', 'bag', 870, 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Mombasa Cement 32.5N (50kg)', 'Standard cement for general construction work', 'Cement', 'bag', 790, 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80', true),
    
    -- Steel
    (demo_supplier_id, 'Y12 Deformed Steel Bars (6m)', 'High tensile deformed bars for concrete reinforcement - KEBS approved', 'Steel', 'bar', 950, 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Y16 Deformed Steel Bars (6m)', 'Heavy duty reinforcement bars - grade 60 steel', 'Steel', 'bar', 1450, 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Y10 Steel Rods (12m)', 'Light reinforcement rods for slabs and beams', 'Steel', 'bar', 680, 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80', true),
    
    -- Tiles
    (demo_supplier_id, 'Vitrified Floor Tiles 600x600mm', 'Premium vitrified porcelain tiles - high gloss finish, stain resistant', 'Tiles', 'sqm', 2800, 'https://images.unsplash.com/photo-1615971677499-5467cbfe1d3f?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Ceramic Wall Tiles 300x600mm', 'Glazed ceramic wall tiles - multiple colors available', 'Tiles', 'sqm', 1650, 'https://images.unsplash.com/photo-1615971677499-5467cbfe1d3f?w=400&h=400&fit=crop&q=80', true),
    
    -- Paint
    (demo_supplier_id, 'Crown Emulsion Paint 20L', 'Crown Paints premium acrylic emulsion - smooth matt finish, washable', 'Paint', '20L bucket', 4800, 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Sadolin Weatherguard 20L', 'Exterior emulsion paint - weather resistant, fade proof', 'Paint', '20L bucket', 6200, 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop&q=80', true),
    
    -- Iron Sheets
    (demo_supplier_id, 'Mabati Iron Sheets Gauge 28 (3m)', 'Mabati box profile corrugated iron sheets - galvanized steel, 25-year warranty', 'Iron Sheets', 'sheet', 1350, 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Mabati Versatile Gauge 30 (3m)', 'Versatile corrugated roofing sheets - rust resistant', 'Iron Sheets', 'sheet', 1180, 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400&h=400&fit=crop&q=80', true),
    
    -- Timber
    (demo_supplier_id, 'Treated Cypress Timber 4x2 (12ft)', 'Pressure-treated cypress timber - termite and borer resistant', 'Timber', 'piece', 850, 'https://images.unsplash.com/photo-1614963366795-38f92b8d2b4a?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Pine Timber 6x2 (12ft)', 'Kiln-dried pine timber for roofing and framing', 'Timber', 'piece', 1200, 'https://images.unsplash.com/photo-1614963366795-38f92b8d2b4a?w=400&h=400&fit=crop&q=80', true),
    
    -- Blocks
    (demo_supplier_id, 'Standard Concrete Blocks 6 inch', 'Solid concrete building blocks - high strength', 'Blocks', 'piece', 55, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Hollow Concrete Blocks 9 inch', 'Hollow core blocks for walls - thermal insulation', 'Blocks', 'piece', 75, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80', true),
    
    -- Aggregates
    (demo_supplier_id, 'Machine Cut Ballast (Per Tonne)', 'Washed machine cut ballast for concrete mix', 'Aggregates', 'tonne', 3500, 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'River Sand (Per Tonne)', 'Clean river sand for plastering and concrete', 'Sand', 'tonne', 2800, 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&h=400&fit=crop&q=80', true),
    
    -- Plumbing
    (demo_supplier_id, 'PVC Pipes 4 inch (6m)', 'PVC sewer pipes - durable and corrosion resistant', 'Plumbing', 'piece', 1850, 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'GI Pipes 1 inch (6m)', 'Galvanized iron water pipes', 'Plumbing', 'piece', 2400, 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop&q=80', true),
    
    -- Electrical
    (demo_supplier_id, 'Electrical Cable 2.5mm (100m)', 'NYM electrical cable - twin and earth', 'Electrical', 'roll', 8500, 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=400&fit=crop&q=80', true),
    (demo_supplier_id, 'Armoured Cable 4mm (100m)', 'Heavy duty armoured cable for outdoor use', 'Electrical', 'roll', 15800, 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=400&fit=crop&q=80', true)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Demo materials inserted successfully';
END $$;

-- Step 5: Verify the setup
-- ================================================================
DO $$
DECLARE
  material_count INTEGER;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check material count
  SELECT COUNT(*) INTO material_count FROM public.materials;
  RAISE NOTICE 'Materials in database: %', material_count;
  
  -- Check RLS
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'materials' 
  AND relnamespace = 'public'::regnamespace;
  
  IF rls_enabled THEN
    RAISE NOTICE 'RLS is ENABLED on materials table ✓';
  ELSE
    RAISE WARNING 'RLS is NOT enabled on materials table!';
  END IF;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'materials';
  
  RAISE NOTICE 'Policies created: %', policy_count;
  
  IF material_count > 0 AND rls_enabled AND policy_count >= 5 THEN
    RAISE NOTICE '✓ Materials table is properly configured and ready for mobile access';
  ELSE
    RAISE WARNING 'Materials table may have issues. Please review the setup.';
  END IF;
END $$;

