-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   📝 ADD DESCRIPTION COLUMN TO SUPPLIER PRODUCT PRICES                               ║
-- ║                                                                                      ║
-- ║   CREATED: January 22, 2026                                                          ║
-- ║   PURPOSE: Allow suppliers to optionally override/add their own product descriptions ║
-- ║            If supplier doesn't set a description, admin description is used          ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Add description column to supplier_product_prices table
-- This is OPTIONAL - suppliers can use admin description if they don't set their own
ALTER TABLE supplier_product_prices 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Confirm changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'supplier_product_prices';

