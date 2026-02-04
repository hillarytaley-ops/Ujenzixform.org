-- ============================================================
-- Fix RLS policies for supplier_product_prices table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Suppliers can view own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can insert own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can manage own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Anyone can view prices" ON supplier_product_prices;

-- Enable RLS
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view prices (needed for price comparison)
CREATE POLICY "Anyone can view prices" ON supplier_product_prices
    FOR SELECT USING (TRUE);

-- Allow suppliers to insert their own prices
-- Match supplier_id to their supplier record OR their user_id
CREATE POLICY "Suppliers can insert own prices" ON supplier_product_prices
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Direct match: supplier_id is the user's ID
            supplier_id = auth.uid() OR
            -- Indirect match: supplier_id is from a supplier record owned by this user
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR
            -- Also allow if user has supplier role
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'supplier')
        )
    );

-- Allow suppliers to update their own prices
CREATE POLICY "Suppliers can update own prices" ON supplier_product_prices
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            supplier_id = auth.uid() OR
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'supplier')
        )
    );

-- Allow suppliers to delete their own prices
CREATE POLICY "Suppliers can delete own prices" ON supplier_product_prices
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            supplier_id = auth.uid() OR
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'supplier')
        )
    );

-- Grant permissions
GRANT SELECT ON supplier_product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON supplier_product_prices TO authenticated;

-- ============================================================
-- Done!
-- ============================================================
