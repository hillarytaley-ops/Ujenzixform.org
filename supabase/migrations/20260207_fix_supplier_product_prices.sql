-- ============================================================
-- Fix Invalid Supplier IDs in supplier_product_prices
-- This migration cleans up orphaned records and adds FK constraint
-- ============================================================

-- Step 1: Find and report invalid supplier_ids
SELECT 
    spp.id,
    spp.supplier_id as invalid_supplier_id,
    spp.product_id,
    spp.price,
    spp.created_at
FROM supplier_product_prices spp
LEFT JOIN suppliers s ON spp.supplier_id = s.id
WHERE s.id IS NULL;

-- Step 2: Get the first valid supplier to use as replacement
-- (Run this to see what we'll use as fallback)
SELECT id, company_name, email FROM suppliers ORDER BY created_at LIMIT 1;

-- Step 3: Update invalid supplier_ids to use the first valid supplier
-- Replace 'YOUR_VALID_SUPPLIER_ID' with the actual ID from Step 2
-- Example: UPDATE supplier_product_prices SET supplier_id = '91623c3b-d44b-46d4-9cf1-b662084d03da'
-- WHERE supplier_id NOT IN (SELECT id FROM suppliers);

-- MANUAL FIX: Run this with the actual valid supplier ID:
/*
UPDATE supplier_product_prices 
SET supplier_id = '91623c3b-d44b-46d4-9cf1-b662084d03da'
WHERE supplier_id NOT IN (SELECT id FROM suppliers);
*/

-- Step 4: Verify the fix
SELECT 
    spp.supplier_id,
    s.company_name,
    COUNT(*) as product_count
FROM supplier_product_prices spp
LEFT JOIN suppliers s ON spp.supplier_id = s.id
GROUP BY spp.supplier_id, s.company_name;

-- Step 5: Add foreign key constraint to prevent this in the future
-- (Only add if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_supplier_product_prices_supplier'
        AND table_name = 'supplier_product_prices'
    ) THEN
        ALTER TABLE supplier_product_prices 
        ADD CONSTRAINT fk_supplier_product_prices_supplier 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
    END IF;
END $$;
