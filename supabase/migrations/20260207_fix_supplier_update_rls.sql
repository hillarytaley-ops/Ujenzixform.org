-- =====================================================================
-- FIX RLS POLICY FOR SUPPLIER UPDATES ON purchase_orders
-- =====================================================================
-- The supplier needs to be able to update orders where they are the supplier_id
-- This includes updating quote_amount, status, supplier_notes, etc.
-- =====================================================================

-- First, check current policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'purchase_orders';

-- Drop existing supplier update policy if it exists
DROP POLICY IF EXISTS "purchase_orders_supplier_update" ON purchase_orders;
DROP POLICY IF EXISTS "po_supplier_update" ON purchase_orders;

-- Create a comprehensive supplier update policy
-- Suppliers can update orders where:
-- 1. supplier_id matches their auth.uid() directly, OR
-- 2. supplier_id matches their suppliers.id (looked up by user_id)
CREATE POLICY "purchase_orders_supplier_update_v2"
ON purchase_orders
FOR UPDATE
USING (
    -- Check if supplier_id matches directly
    supplier_id = auth.uid()
    OR
    -- Check if supplier_id matches the supplier's record ID
    supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    supplier_id = auth.uid()
    OR
    supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    )
);

-- Verify the policy was created
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'purchase_orders' AND cmd = 'UPDATE';
