-- ============================================================================
-- Fix RLS policy for purchase_orders to allow suppliers to update quotes
-- Created: February 9, 2026
-- Issue: Suppliers cannot send quotes because RLS blocks updates
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_update" ON purchase_orders;

-- Create new update policy that allows:
-- 1. Buyers to update their own orders
-- 2. Suppliers to update orders assigned to them (to send quotes)
-- 3. Admins to update any order
CREATE POLICY "purchase_orders_update_policy"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    -- Buyer can update their own orders
    buyer_id = auth.uid()
    -- Supplier can update orders assigned to them (direct match)
    OR supplier_id = auth.uid()
    -- Supplier can update orders where their suppliers.id matches
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = purchase_orders.supplier_id
      AND s.user_id = auth.uid()
    )
    -- Admins can update any order
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    buyer_id = auth.uid()
    OR supplier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = purchase_orders.supplier_id
      AND s.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Also ensure suppliers can SELECT orders assigned to them
DROP POLICY IF EXISTS "purchase_orders_supplier_select" ON purchase_orders;

CREATE POLICY "purchase_orders_supplier_select"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    -- Direct supplier_id match
    supplier_id = auth.uid()
    -- Or through suppliers table
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = purchase_orders.supplier_id
      AND s.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;

-- Log completion
DO $$ BEGIN RAISE NOTICE 'purchase_orders RLS policies updated for supplier quote updates'; END $$;
