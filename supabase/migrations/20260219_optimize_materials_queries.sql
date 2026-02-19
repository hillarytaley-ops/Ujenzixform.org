-- ============================================================
-- Optimize Materials/Products Loading
-- Add indexes for faster queries
-- Created: February 19, 2026
-- ============================================================

-- ============================================================
-- 1. INDEXES FOR admin_material_images TABLE
-- ============================================================

-- Index for approved materials (most common query)
CREATE INDEX IF NOT EXISTS idx_admin_material_images_approved 
ON admin_material_images(is_approved) 
WHERE is_approved = true;

-- Composite index for approved + category filtering
CREATE INDEX IF NOT EXISTS idx_admin_material_images_approved_category 
ON admin_material_images(is_approved, category) 
WHERE is_approved = true;

-- Index for sorting by created_at (pagination)
CREATE INDEX IF NOT EXISTS idx_admin_material_images_created_desc 
ON admin_material_images(created_at DESC);

-- Composite index for approved + created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_admin_material_images_approved_created 
ON admin_material_images(is_approved, created_at DESC) 
WHERE is_approved = true;

-- Index for name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_admin_material_images_name_lower 
ON admin_material_images(LOWER(name));

-- Index for category search
CREATE INDEX IF NOT EXISTS idx_admin_material_images_category_lower 
ON admin_material_images(LOWER(category));

-- ============================================================
-- 2. INDEXES FOR supplier_product_prices TABLE
-- ============================================================

-- Index for product_id lookups
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_product 
ON supplier_product_prices(product_id);

-- Index for supplier_id lookups
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_supplier 
ON supplier_product_prices(supplier_id);

-- Composite index for product + in_stock
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_product_stock 
ON supplier_product_prices(product_id, in_stock);

-- Index for price sorting
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_price 
ON supplier_product_prices(price);

-- ============================================================
-- 3. INDEXES FOR materials TABLE (if exists)
-- ============================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
        -- Index for supplier_id
        CREATE INDEX IF NOT EXISTS idx_materials_supplier 
        ON materials(supplier_id);
        
        -- Index for in_stock
        CREATE INDEX IF NOT EXISTS idx_materials_in_stock 
        ON materials(in_stock) 
        WHERE in_stock = true;
        
        -- Index for category
        CREATE INDEX IF NOT EXISTS idx_materials_category 
        ON materials(category);
        
        -- Composite index for supplier + in_stock
        CREATE INDEX IF NOT EXISTS idx_materials_supplier_stock 
        ON materials(supplier_id, in_stock);
    END IF;
END $$;

-- ============================================================
-- 4. INDEXES FOR suppliers TABLE
-- ============================================================

-- Index for status (active suppliers)
CREATE INDEX IF NOT EXISTS idx_suppliers_status 
ON suppliers(status) 
WHERE status = 'active';

-- Index for rating sorting
CREATE INDEX IF NOT EXISTS idx_suppliers_rating 
ON suppliers(rating DESC);

-- ============================================================
-- 5. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================

ANALYZE admin_material_images;
ANALYZE supplier_product_prices;
ANALYZE suppliers;

-- ============================================================
-- Migration Complete
-- ============================================================
