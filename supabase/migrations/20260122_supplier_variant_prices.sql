-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   💰 SUPPLIER VARIANT PRICES - Allow suppliers to set prices for each variant        ║
-- ║                                                                                      ║
-- ║   CREATED: January 22, 2026                                                          ║
-- ║   PURPOSE: Allow suppliers to override admin variant prices with their own prices    ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Add variant_prices column to supplier_product_prices table
-- This stores a JSON array of variant prices that override admin variant prices
-- Format: [{"variant_id": "uuid", "price": 100}, ...]
ALTER TABLE supplier_product_prices 
ADD COLUMN IF NOT EXISTS variant_prices JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the column
COMMENT ON COLUMN supplier_product_prices.variant_prices IS 'JSON array of variant prices: [{"variant_id": "uuid", "price": number, "sizeLabel": "1`"}, ...]';

-- Create index for faster queries on variant_prices
CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_variant_prices 
ON supplier_product_prices USING GIN (variant_prices);

