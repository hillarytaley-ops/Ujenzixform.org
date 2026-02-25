-- ============================================================
-- Add market_price column to supplier_product_prices table
-- This allows suppliers to track cost price vs selling price
-- for profit tracking
-- Created: February 25, 2026
-- ============================================================

-- Add market_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'supplier_product_prices' AND column_name = 'market_price') THEN
        ALTER TABLE supplier_product_prices ADD COLUMN market_price DECIMAL(12,2) DEFAULT 0;
        COMMENT ON COLUMN supplier_product_prices.market_price IS 'Cost price / market price for the product';
    END IF;
END $$;

-- Create index for profit analysis queries
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_market_price ON supplier_product_prices(market_price);

-- Create a view for profit analysis (optional, for reporting)
CREATE OR REPLACE VIEW supplier_profit_analysis AS
SELECT 
    spp.id,
    spp.supplier_id,
    spp.product_id,
    ami.name as product_name,
    ami.category,
    spp.market_price,
    spp.price as selling_price,
    (spp.price - spp.market_price) as profit_per_unit,
    CASE 
        WHEN spp.market_price > 0 THEN 
            ROUND(((spp.price - spp.market_price) / spp.market_price * 100)::numeric, 2)
        ELSE 0 
    END as profit_margin_percent,
    spp.stock_quantity,
    (spp.stock_quantity * (spp.price - spp.market_price)) as potential_profit,
    spp.in_stock,
    spp.updated_at
FROM supplier_product_prices spp
LEFT JOIN admin_material_images ami ON ami.id = spp.product_id
WHERE spp.market_price IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON supplier_profit_analysis TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
