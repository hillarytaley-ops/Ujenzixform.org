-- ============================================================
-- Allow delivery providers to see purchase_orders for PENDING
-- delivery requests (so Alerts tab can show po_number & address)
-- Created: March 18, 2026
--
-- Problem: purchase_order_visible_to_delivery_provider only allowed
-- POs where provider_id = auth.uid(). Pending requests have
-- provider_id NULL, so their POs were hidden → "purchase_order not
-- found", no po_number, and FAST PATH excluding delivery_requests.
--
-- Fix: Also allow SELECT on purchase_orders when there exists a
-- delivery_request for that PO with status IN ('pending','requested',
-- 'assigned') so providers can see order details when deciding to accept.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purchase_order_visible_to_delivery_provider(po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Already assigned to this provider (delivery_request)
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id AND dr.provider_id = auth.uid()
  )
  OR
  -- PO has delivery_provider_id set to this user
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_id AND po.delivery_provider_id = auth.uid()
  )
  OR
  -- Pending/requested/assigned delivery request for this PO (so provider can see details to accept)
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.purchase_order_id = po_id
      AND dr.status IN ('pending', 'requested', 'assigned')
  );
$$;

COMMENT ON FUNCTION public.purchase_order_visible_to_delivery_provider(uuid) IS
  'RLS helper: provider can see PO if assigned, or if PO has delivery_provider_id set, or if there is a pending/requested/assigned delivery_request for this PO.';
