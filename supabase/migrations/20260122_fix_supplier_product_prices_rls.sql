-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🔧 FIX SUPPLIER PRODUCT PRICES RLS POLICY                                          ║
-- ║                                                                                      ║
-- ║   CREATED: January 22, 2026                                                          ║
-- ║   ISSUE: The previous RLS policy required supplier_id to match a record in the       ║
-- ║          suppliers table, but the suppliers table is empty. The app uses auth.uid()  ║
-- ║          directly as supplier_id.                                                    ║
-- ║                                                                                      ║
-- ║   FIX: Allow suppliers to INSERT/UPDATE where supplier_id = auth.uid()               ║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "supplier_product_prices_insert" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can insert own prices" ON supplier_product_prices;

-- Create a new INSERT policy that allows suppliers to use their auth.uid() as supplier_id
CREATE POLICY "supplier_product_prices_insert"
  ON supplier_product_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Supplier can insert prices where supplier_id matches their auth.uid()
    supplier_id = auth.uid()
    -- OR they have a record in the suppliers table (for future compatibility)
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_product_prices.supplier_id
      AND s.user_id = auth.uid()
    )
    -- OR they are admin
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

-- Also fix the UPDATE policy
DROP POLICY IF EXISTS "supplier_product_prices_update" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;

CREATE POLICY "supplier_product_prices_update"
  ON supplier_product_prices FOR UPDATE
  TO authenticated
  USING (
    -- Supplier can update their own prices
    supplier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_product_prices.supplier_id
      AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  );

-- Ensure SELECT policy allows anyone to view prices (for frontend)
DROP POLICY IF EXISTS "Anyone can view product prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "supplier_product_prices_select" ON supplier_product_prices;

CREATE POLICY "supplier_product_prices_select"
  ON supplier_product_prices FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grant necessary permissions
GRANT ALL ON supplier_product_prices TO authenticated;
GRANT SELECT ON supplier_product_prices TO anon;

