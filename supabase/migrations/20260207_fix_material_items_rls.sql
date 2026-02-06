-- =====================================================================
-- FIX MATERIAL_ITEMS RLS POLICY FOR SUPPLIERS
-- =====================================================================
-- The issue: The current policy joins profiles.user_id = suppliers.user_id
-- But the actual relationship is: suppliers.user_id = profiles.id
-- =====================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Suppliers can view their material items" ON material_items;

-- Create the corrected policy
-- Chain: auth.uid() -> profiles.user_id -> profiles.id -> suppliers.user_id -> suppliers.id -> material_items.supplier_id
CREATE POLICY "Suppliers can view their material items"
ON material_items FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM suppliers s
        JOIN profiles p ON s.user_id = p.id  -- suppliers.user_id references profiles.id
        WHERE p.user_id = auth.uid()          -- profiles.user_id is the auth user
        AND s.id = material_items.supplier_id -- match supplier to material items
    )
);

-- Also update the material_items_builder_select policy to include proper supplier check
DROP POLICY IF EXISTS "material_items_builder_select" ON material_items;

CREATE POLICY "material_items_builder_select"
ON material_items FOR SELECT
USING (
    -- Builders can see their ordered items
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = material_items.purchase_order_id
        AND po.buyer_id = auth.uid()
    )
    OR
    -- Admins can see all
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
    OR
    -- Suppliers can see their items (via profile chain)
    EXISTS (
        SELECT 1
        FROM suppliers s
        JOIN profiles p ON s.user_id = p.id
        WHERE p.user_id = auth.uid()
        AND s.id = material_items.supplier_id
    )
    OR
    -- Direct supplier_id match (legacy)
    supplier_id = auth.uid()
);

-- Verify the fix
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'material_items';
