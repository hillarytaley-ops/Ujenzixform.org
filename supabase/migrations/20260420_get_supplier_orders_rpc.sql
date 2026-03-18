-- ============================================================
-- RPC: Get purchase orders for the current supplier (auth.uid())
-- Use when client-side supplier_id resolution or RLS returns no rows.
-- SECURITY DEFINER so it runs with definer rights; restricts by auth.uid().
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_supplier_orders_for_current_user(_limit integer DEFAULT 500)
RETURNS SETOF public.purchase_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT po.*
  FROM purchase_orders po
  WHERE po.supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  ORDER BY po.created_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_orders_for_current_user(integer) TO authenticated;

COMMENT ON FUNCTION public.get_supplier_orders_for_current_user(integer) IS
  'Returns purchase_orders for the current user as supplier. Use for supplier dashboard when direct select returns empty.';
