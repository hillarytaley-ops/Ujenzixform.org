-- =====================================================
-- Add pricing_type and variants columns to admin_material_images table
-- For supporting Single Price vs Multiple Sizes/Variants
-- =====================================================

-- Add pricing_type column (defaults to 'single' for existing products)
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'single';

-- Add variants column as JSONB array
-- Structure: [{ "id": "uuid", "sizeLabel": "50kg", "price": 1500, "stock": 100 }, ...]
ALTER TABLE admin_material_images 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Create index for faster querying of products with variants
CREATE INDEX IF NOT EXISTS idx_admin_material_images_pricing_type ON admin_material_images(pricing_type);

-- Update existing products to have 'single' pricing type if null
UPDATE admin_material_images 
SET pricing_type = 'single' 
WHERE pricing_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN admin_material_images.pricing_type IS 'Type of pricing: single (one price) or variants (multiple sizes/prices)';
COMMENT ON COLUMN admin_material_images.variants IS 'JSON array of price variants: [{id, sizeLabel, price, stock}]';

-- =====================================================
-- Also add to supplier_materials table for supplier products (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_materials') THEN
    ALTER TABLE supplier_materials 
    ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'single';

    ALTER TABLE supplier_materials 
    ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

    UPDATE supplier_materials 
    SET pricing_type = 'single' 
    WHERE pricing_type IS NULL;
  END IF;
END $$;

-- =====================================================
-- Also add to materials table (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'materials') THEN
    ALTER TABLE materials 
    ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'single';

    ALTER TABLE materials 
    ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

    UPDATE materials 
    SET pricing_type = 'single' 
    WHERE pricing_type IS NULL;
  END IF;
END $$;
