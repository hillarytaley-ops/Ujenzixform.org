-- ============================================================
-- RPC: Get material_items for current supplier (QR Codes)
-- Uses auth.uid() with both profile chain and direct match for compatibility.
-- Handles: suppliers.user_id = auth.uid() OR suppliers.user_id = profiles.id.
-- SECURITY DEFINER - restricts by auth.uid() in the query.
-- ============================================================

-- Also fix get_supplier_orders_for_current_user for same compatibility
CREATE OR REPLACE FUNCTION public.get_supplier_orders_for_current_user(_limit integer DEFAULT 500)
RETURNS SETOF public.purchase_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT po.*
  FROM purchase_orders po
  WHERE po.supplier_id IN (
    SELECT s.id FROM suppliers s
    WHERE s.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id AND p.user_id = auth.uid())
  )
  ORDER BY po.created_at DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_material_items_for_current_user(_limit integer DEFAULT 500)
RETURNS SETOF public.material_items
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mi.*
  FROM material_items mi
  WHERE mi.supplier_id IN (
    -- Match suppliers by auth.uid() (direct or via profile)
    SELECT s.id FROM suppliers s
    WHERE s.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id AND p.user_id = auth.uid())
  )
  OR mi.purchase_order_id IN (
    -- Fallback: POs where we are the supplier (handles material_items with null/wrong supplier_id)
    SELECT po.id FROM purchase_orders po
    WHERE po.supplier_id IN (
      SELECT s.id FROM suppliers s
      WHERE s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id AND p.user_id = auth.uid())
    )
  )
  ORDER BY mi.created_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_material_items_for_current_user(integer) TO authenticated;

COMMENT ON FUNCTION public.get_supplier_material_items_for_current_user(integer) IS
  'Returns material_items (QR codes) for the current user as supplier. Handles both suppliers.user_id schemas.';
