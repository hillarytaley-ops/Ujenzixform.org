-- ============================================================
-- Block suppliers from viewing competitor price comparisons
-- Requirement: suppliers must never see other suppliers' prices.
-- Buyers/anon can still view prices for marketplace comparison.
-- ============================================================

-- supplier_product_prices: replace permissive select policy with role-aware policies
DROP POLICY IF EXISTS "Anyone can view prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Public can view prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can view own prices" ON public.supplier_product_prices;

-- Non-suppliers (including anon) can view prices.
CREATE POLICY "Public can view prices" ON public.supplier_product_prices
  FOR SELECT
  USING (
    auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'supplier'
    )
  );

-- Suppliers can only view their own prices.
CREATE POLICY "Suppliers can view own prices" ON public.supplier_product_prices
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'supplier'
    )
    AND (
      supplier_id = auth.uid()
      OR supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
    )
  );

-- ============================================================
-- Done
-- ============================================================

