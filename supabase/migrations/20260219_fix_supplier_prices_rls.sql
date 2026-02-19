-- ============================================================
-- Fix RLS policies for supplier_product_prices table
-- Allow public read access so frontend can display prices
-- Created: February 19, 2026
-- ============================================================

-- Enable RLS if not already enabled
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view supplier prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Public can view supplier prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can view all prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can insert own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can delete own prices" ON supplier_product_prices;

-- CRITICAL: Allow ANYONE (including anonymous) to read supplier prices
-- This is needed for the public materials marketplace to show prices
CREATE POLICY "Anyone can view supplier prices"
ON supplier_product_prices
FOR SELECT
TO public
USING (true);

-- Also allow anon role specifically
CREATE POLICY "Anon can view supplier prices"
ON supplier_product_prices
FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to view all prices
CREATE POLICY "Authenticated can view all prices"
ON supplier_product_prices
FOR SELECT
TO authenticated
USING (true);

-- Suppliers can insert their own prices
CREATE POLICY "Suppliers can insert own prices"
ON supplier_product_prices
FOR INSERT
TO authenticated
WITH CHECK (
  supplier_id = auth.uid() OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Suppliers can update their own prices
CREATE POLICY "Suppliers can update own prices"
ON supplier_product_prices
FOR UPDATE
TO authenticated
USING (
  supplier_id = auth.uid() OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Suppliers can delete their own prices
CREATE POLICY "Suppliers can delete own prices"
ON supplier_product_prices
FOR DELETE
TO authenticated
USING (
  supplier_id = auth.uid() OR
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Grant necessary permissions
GRANT SELECT ON supplier_product_prices TO anon;
GRANT SELECT ON supplier_product_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON supplier_product_prices TO authenticated;

-- ============================================================
-- Verify the fix
-- ============================================================
-- Run this to test: SELECT * FROM supplier_product_prices LIMIT 5;
