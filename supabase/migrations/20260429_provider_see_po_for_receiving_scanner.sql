-- ============================================================
-- Fix: Receiving Scanner "No Deliveries Found" - provider sees POs
-- Created: April 29, 2026
--
-- 20260330_fix_purchase_orders_rls_recursion.sql replaced
-- purchase_order_visible_to_delivery_provider with a version that only
-- checks dr.provider_id = auth.uid() and po.delivery_provider_id = auth.uid().
-- Many delivery_requests have provider_id = delivery_providers.id (UUID),
-- so those providers get 0 rows from purchase_orders → scanner shows nothing.
--
-- Restore full logic: provider sees PO when
-- - dr.provider_id = auth.uid(), OR
-- - dr.provider_id = delivery_providers.id AND dp.user_id = auth.uid(), OR
-- - po.delivery_provider_id = auth.uid(), OR
-- - po.delivery_provider_id = delivery_providers.id AND dp.user_id = auth.uid(), OR
-- - pending/requested/assigned delivery_request for this PO.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purchase_order_visible_to_delivery_provider(po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id AND dr.provider_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id AND dp.user_id = auth.uid()
    WHERE dr.purchase_order_id = po_id
  )
  OR EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_id AND po.delivery_provider_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN delivery_providers dp ON dp.id = po.delivery_provider_id AND dp.user_id = auth.uid()
    WHERE po.id = po_id
  )
  OR EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id
      AND dr.status IN ('pending', 'requested', 'assigned')
  );
$$;

COMMENT ON FUNCTION public.purchase_order_visible_to_delivery_provider(uuid) IS
  'RLS: provider sees PO if assigned (user_id or delivery_providers.id), or PO.delivery_provider_id, or pending/requested/assigned DR. Required for Receiving Scanner.';
