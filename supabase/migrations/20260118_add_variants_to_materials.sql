-- =====================================================
-- Add pricing_type and variants columns to material_images table
-- For supporting Single Price vs Multiple Sizes/Variants
-- =====================================================

-- Add pricing_type column (defaults to 'single' for existing products)
ALTER TABLE material_images 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'single' CHECK (pricing_type IN ('single', 'variants'));

-- Add variants column as JSONB array
-- Structure: [{ "id": "uuid", "sizeLabel": "50kg", "price": 1500, "stock": 100 }, ...]
ALTER TABLE material_images 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Create index for faster querying of products with variants
CREATE INDEX IF NOT EXISTS idx_material_images_pricing_type ON material_images(pricing_type);

-- Update existing products to have 'single' pricing type if null
UPDATE material_images 
SET pricing_type = 'single' 
WHERE pricing_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN material_images.pricing_type IS 'Type of pricing: single (one price) or variants (multiple sizes/prices)';
COMMENT ON COLUMN material_images.variants IS 'JSON array of price variants: [{id, sizeLabel, price, stock}]';

-- =====================================================
-- Also add to supplier_materials table for supplier products
-- =====================================================

ALTER TABLE supplier_materials 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'single' CHECK (pricing_type IN ('single', 'variants'));

ALTER TABLE supplier_materials 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_supplier_materials_pricing_type ON supplier_materials(pricing_type);

UPDATE supplier_materials 
SET pricing_type = 'single' 
WHERE pricing_type IS NULL;

COMMENT ON COLUMN supplier_materials.pricing_type IS 'Type of pricing: single (one price) or variants (multiple sizes/prices)';
COMMENT ON COLUMN supplier_materials.variants IS 'JSON array of price variants: [{id, sizeLabel, price, stock}]';

