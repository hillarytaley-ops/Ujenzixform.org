-- ============================================================
-- Fix: providers see POs when assigned via delivery_providers.id
-- Created: March 19, 2026
--
-- FAST PATH was still getting 0/3 po_numbers for accepted orders
-- because provider_id can be delivery_providers.id (not auth.uid()).
-- Add condition so PO is visible when dr.provider_id matches
-- current user via delivery_providers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purchase_order_visible_to_delivery_provider(po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Assigned to this provider: provider_id = user_id (legacy)
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id AND dr.provider_id = auth.uid()
  )
  OR
  -- Assigned to this provider: provider_id = delivery_providers.id
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id AND dp.user_id = auth.uid()
    WHERE dr.purchase_order_id = po_id
  )
  OR
  -- PO has delivery_provider_id set to this user
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_id AND po.delivery_provider_id = auth.uid()
  )
  OR
  -- Pending/requested/assigned (so provider can see details to accept)
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id
      AND dr.status IN ('pending', 'requested', 'assigned')
  );
$$;

COMMENT ON FUNCTION public.purchase_order_visible_to_delivery_provider(uuid) IS
  'RLS: provider sees PO if assigned (user_id or delivery_providers.id), or PO.delivery_provider_id, or pending/requested/assigned DR.';
