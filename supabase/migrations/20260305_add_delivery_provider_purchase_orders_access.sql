-- ============================================================
-- Add RLS Policy for Delivery Providers to Access Purchase Orders
-- This allows delivery providers to read po_number from purchase_orders
-- that are linked to delivery_requests they have access to
-- ============================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "purchase_orders_delivery_provider_access" ON public.purchase_orders;

-- Create a simpler, more efficient policy for delivery providers
-- This allows access if there's a delivery_request with this purchase_order_id
-- and the provider_id matches the current user (most common case)
-- Using a simple EXISTS with indexed columns for performance
CREATE POLICY "purchase_orders_delivery_provider_access" 
ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  -- Simple check: if there's a delivery_request with this purchase_order_id
  -- and the provider_id matches the current user (most common case)
  -- This is the fastest check and covers 99% of cases
  EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.purchase_order_id = purchase_orders.id
    AND dr.provider_id = auth.uid()
  )
  OR
  -- Fallback: if purchase_order has delivery_provider_id set to current user
  purchase_orders.delivery_provider_id = auth.uid()
);

-- Grant SELECT permission (should already be granted, but ensure it)
GRANT SELECT ON public.purchase_orders TO authenticated;

-- ============================================================
-- Add indexes to improve RLS policy performance
-- ============================================================

-- Index on delivery_requests for fast lookup by purchase_order_id and provider_id
CREATE INDEX IF NOT EXISTS idx_delivery_requests_po_provider 
ON public.delivery_requests(purchase_order_id, provider_id) 
WHERE purchase_order_id IS NOT NULL AND provider_id IS NOT NULL;

-- Index on purchase_orders for fast lookup by delivery_provider_id
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_provider_id 
ON public.purchase_orders(delivery_provider_id) 
WHERE delivery_provider_id IS NOT NULL;

-- ============================================================
-- Migration Complete
-- ============================================================
