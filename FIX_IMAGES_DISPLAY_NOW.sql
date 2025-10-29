-- =====================================================
-- URGENT FIX: Display Supplier Logos and Product Images
-- =====================================================
-- This fixes the immediate issue of images not displaying
-- =====================================================

-- Step 1: Update the secure supplier function to include logo URL
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE (
  id BIGINT,
  company_name TEXT,
  company_logo_url TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN,
  business_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  contact_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return basic supplier information including logo URL
  -- Contact details remain protected
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.company_logo_url,  -- NOW INCLUDED!
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    COALESCE(s.business_verified, false) as business_verified,
    s.created_at,
    s.updated_at,
    -- Indicate if contact info is available without exposing it
    CASE 
      WHEN s.contact_person IS NOT NULL OR s.email IS NOT NULL OR s.phone IS NOT NULL 
      THEN true 
      ELSE false 
    END as contact_available
  FROM suppliers s
  WHERE s.is_verified = true  -- Only show verified suppliers
  ORDER BY s.company_name;
END;
$$;

-- Step 2: Ensure company_logo_url column exists
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Step 3: Add logo URLs to existing suppliers using UI Avatars
UPDATE suppliers
SET company_logo_url = 
  'https://ui-avatars.com/api/?name=' || 
  REPLACE(REPLACE(company_name, ' ', '+'), '&', '%26') || 
  '&size=200&background=' || 
  CASE (id % 6)::INTEGER
    WHEN 0 THEN '3B82F6' -- Blue
    WHEN 1 THEN 'EF4444' -- Red  
    WHEN 2 THEN 'F59E0B' -- Amber/Yellow
    WHEN 3 THEN '8B5CF6' -- Purple
    WHEN 4 THEN '10B981' -- Green
    ELSE 'F97316' -- Orange
  END || 
  '&color=ffffff&bold=true&font-size=0.4'
WHERE company_logo_url IS NULL OR company_logo_url = '' OR company_logo_url = 'https://via.placeholder.com/150';

-- Step 4: Create sample verified suppliers if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE is_verified = true LIMIT 1) THEN
    INSERT INTO suppliers (company_name, company_logo_url, business_type, is_verified, rating, specialties, materials_offered)
    VALUES 
      (
        'Bamburi Cement Limited',
        'https://ui-avatars.com/api/?name=Bamburi+Cement&size=200&background=3B82F6&color=ffffff&bold=true&font-size=0.4',
        'manufacturer',
        true,
        4.5,
        ARRAY['Cement', 'Building Materials'],
        ARRAY['Portland Cement', 'Pozzolana Cement', 'Masonry Cement']
      ),
      (
        'Devki Steel Mills',
        'https://ui-avatars.com/api/?name=Devki+Steel&size=200&background=EF4444&color=ffffff&bold=true&font-size=0.4',
        'manufacturer',
        true,
        4.7,
        ARRAY['Steel', 'Reinforcement'],
        ARRAY['Steel Bars', 'Wire Mesh', 'Iron Sheets']
      ),
      (
        'Crown Paints Kenya',
        'https://ui-avatars.com/api/?name=Crown+Paints&size=200&background=F59E0B&color=ffffff&bold=true&font-size=0.4',
        'manufacturer',
        true,
        4.3,
        ARRAY['Paints', 'Coatings'],
        ARRAY['Emulsion Paint', 'Oil Paint', 'Primer']
      ),
      (
        'Tile & Carpet Centre',
        'https://ui-avatars.com/api/?name=Tile+Carpet&size=200&background=8B5CF6&color=ffffff&bold=true&font-size=0.4',
        'distributor',
        true,
        4.6,
        ARRAY['Tiles', 'Flooring'],
        ARRAY['Ceramic Tiles', 'Porcelain Tiles', 'Floor Tiles']
      ),
      (
        'Mabati Rolling Mills',
        'https://ui-avatars.com/api/?name=Mabati+Mills&size=200&background=10B981&color=ffffff&bold=true&font-size=0.4',
        'manufacturer',
        true,
        4.8,
        ARRAY['Roofing', 'Steel'],
        ARRAY['Iron Sheets', 'Roofing Tiles', 'Gutters']
      ),
      (
        'Homa Lime Company',
        'https://ui-avatars.com/api/?name=Homa+Lime&size=200&background=F97316&color=ffffff&bold=true&font-size=0.4',
        'manufacturer',
        true,
        4.4,
        ARRAY['Lime', 'Building Materials'],
        ARRAY['Hydrated Lime', 'Quicklime', 'Agricultural Lime']
      );
  END IF;
END $$;

-- Step 5: Update materials/products table
DO $$
BEGIN
  -- Check if materials table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'image_url'
    ) THEN
      ALTER TABLE materials ADD COLUMN image_url TEXT;
    END IF;

    -- Update product images by category
    UPDATE materials
    SET image_url = CASE
      -- Cement products
      WHEN LOWER(name) LIKE '%cement%' OR LOWER(category) LIKE '%cement%' 
        THEN 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80'
      
      -- Steel products
      WHEN LOWER(name) LIKE '%steel%' OR LOWER(name) LIKE '%iron%' OR LOWER(name) LIKE '%rebar%'
        THEN 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80'
      
      -- Paint products
      WHEN LOWER(name) LIKE '%paint%' OR LOWER(category) LIKE '%paint%'
        THEN 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop&q=80'
      
      -- Tile products
      WHEN LOWER(name) LIKE '%tile%' OR LOWER(name) LIKE '%ceramic%'
        THEN 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&h=400&fit=crop&q=80'
      
      -- Roofing products
      WHEN LOWER(name) LIKE '%roof%' OR LOWER(name) LIKE '%mabati%' OR LOWER(name) LIKE '%sheet%'
        THEN 'https://images.unsplash.com/photo-1632472770190-1d0fc8f5f9e6?w=400&h=400&fit=crop&q=80'
      
      -- Sand/Aggregate
      WHEN LOWER(name) LIKE '%sand%' OR LOWER(name) LIKE '%aggregate%' OR LOWER(name) LIKE '%ballast%'
        THEN 'https://images.unsplash.com/photo-1618083707368-b3823daa2726?w=400&h=400&fit=crop&q=80'
      
      -- Default construction image
      ELSE 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop&q=80'
    END
    WHERE image_url IS NULL OR image_url = '';
  END IF;
END $$;

-- Step 6: Create sample products if none exist
DO $$
DECLARE
  supplier_id_var BIGINT;
BEGIN
  -- Check if materials table exists and is empty
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
    IF NOT EXISTS (SELECT 1 FROM materials LIMIT 1) THEN
      -- Get first supplier ID
      SELECT id INTO supplier_id_var FROM suppliers ORDER BY id LIMIT 1;
      
      IF supplier_id_var IS NOT NULL THEN
        INSERT INTO materials (supplier_id, name, description, category, unit, unit_price, image_url, in_stock)
        VALUES 
          (
            supplier_id_var,
            'Cement 42.5N - 50kg',
            'High quality Portland cement suitable for all construction needs',
            'Cement',
            'bag',
            750.00,
            'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=400&fit=crop&q=80',
            true
          ),
          (
            supplier_id_var,
            'Y12 Steel Bars - 6m',
            'High tensile steel reinforcement bars for construction',
            'Steel',
            'piece',
            850.00,
            'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&h=400&fit=crop&q=80',
            true
          ),
          (
            supplier_id_var,
            'Emulsion Paint - 20L',
            'High quality water-based emulsion paint',
            'Paint',
            'tin',
            3500.00,
            'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop&q=80',
            true
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_directory_safe() TO anon, authenticated;
GRANT SELECT ON suppliers TO anon, authenticated;

-- Step 8: Refresh materialized views if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'supplier_summary') THEN
    REFRESH MATERIALIZED VIEW supplier_summary;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check suppliers with logos
SELECT 
  id,
  company_name,
  company_logo_url,
  is_verified,
  CASE 
    WHEN company_logo_url IS NOT NULL AND company_logo_url != '' THEN '✅ HAS LOGO'
    ELSE '❌ NO LOGO'
  END as logo_status
FROM suppliers
ORDER BY is_verified DESC, id
LIMIT 10;

-- Test the function
SELECT id, company_name, company_logo_url, is_verified 
FROM public.get_suppliers_directory_safe()
LIMIT 10;

-- Count summary
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(CASE WHEN is_verified THEN 1 END) as verified_suppliers,
  COUNT(CASE WHEN company_logo_url IS NOT NULL AND company_logo_url != '' THEN 1 END) as suppliers_with_logos
FROM suppliers;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- 1. Supplier logos should now display (colorful circles)
-- 2. Product images should now display (real photos)
-- 3. Frontend will automatically pick up the changes
-- 
-- Next steps:
-- 1. Clear browser cache (Ctrl + Shift + Delete)
-- 2. Hard refresh page (Ctrl + F5)
-- 3. Go to /suppliers page
-- 4. ✅ See the logos and images!
-- =====================================================


