-- Allow suppliers to resolve buyer roles for purchase_orders they supply (for UI badges / alerts).
-- Direct SELECT on user_roles is limited to own row; this RPC is scoped by purchase_orders linkage.

CREATE OR REPLACE FUNCTION public.get_buyer_roles_for_supplier_orders(p_buyer_ids uuid[])
RETURNS TABLE(user_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id, ur.role::text AS role
  FROM public.user_roles ur
  WHERE p_buyer_ids IS NOT NULL
    AND cardinality(p_buyer_ids) > 0
    AND ur.user_id = ANY(p_buyer_ids)
    AND EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.buyer_id = ur.user_id
        AND (
          po.supplier_id = auth.uid()
          OR po.supplier_id IN (
            SELECT s.id
            FROM public.suppliers s
            WHERE s.user_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = s.user_id AND p.user_id = auth.uid()
               )
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_buyer_roles_for_supplier_orders(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_buyer_roles_for_supplier_orders(uuid[]) IS
  'Returns user_roles rows only for buyers who have at least one purchase_order with the current supplier.';
