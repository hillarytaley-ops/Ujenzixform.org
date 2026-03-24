-- purchase_orders.buyer_id is often public.profiles.id (see CartSidebar, QuoteCart, etc.),
-- but policy purchase_orders_buyer_select (20260119) only allowed buyer_id = auth.uid().
-- Result: builders could create orders but RLS hid them from SELECT → project cards showed 0 orders / 0 spent.

DROP POLICY IF EXISTS "purchase_orders_buyer_select" ON public.purchase_orders;

CREATE POLICY "purchase_orders_buyer_select" ON public.purchase_orders
FOR SELECT TO authenticated
USING (
    buyer_id = (SELECT auth.uid())
    OR buyer_id IN (
        SELECT pr.id FROM public.profiles pr WHERE pr.user_id = (SELECT auth.uid())
    )
    OR supplier_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'admin'::app_role
    )
);

-- Additive INSERT: permissive RLS allows the row if any INSERT policy WITH CHECK passes.
DROP POLICY IF EXISTS "purchase_orders_buyer_own_insert" ON public.purchase_orders;
CREATE POLICY "purchase_orders_buyer_own_insert" ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (
    buyer_id = (SELECT auth.uid())
    OR buyer_id IN (
        SELECT pr.id FROM public.profiles pr WHERE pr.user_id = (SELECT auth.uid())
    )
);

COMMENT ON POLICY "purchase_orders_buyer_select" ON public.purchase_orders IS
  'Builders see POs where buyer_id is auth uid or their profiles.id; suppliers/admins unchanged.';
