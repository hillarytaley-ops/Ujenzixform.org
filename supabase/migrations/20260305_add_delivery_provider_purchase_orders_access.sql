-- ============================================================
-- Add RLS Policy for Delivery Providers to Access Purchase Orders
-- This allows delivery providers to read po_number from purchase_orders
-- that are linked to delivery_requests they have access to
-- ============================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "purchase_orders_delivery_provider_access" ON public.purchase_orders;

-- Create a simpler, more efficient policy for delivery providers
-- This allows access if:
-- 1. There's a delivery_request with this purchase_order_id AND provider_id matches user
-- 2. OR purchase_orders.delivery_provider_id matches user
-- 3. OR user is a delivery provider linked via delivery_providers table
CREATE POLICY "purchase_orders_delivery_provider_access" 
ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  -- Simple check: if there's a delivery_request with this purchase_order_id
  -- and the provider_id matches the current user (most common case)
  EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.purchase_order_id = purchase_orders.id
    AND dr.provider_id = auth.uid()
  )
  OR
  -- OR if purchase_order has delivery_provider_id set to current user
  purchase_orders.delivery_provider_id = auth.uid()
  OR
  -- OR if user is a delivery provider and provider_id in delivery_requests matches their delivery_provider.id
  EXISTS (
    SELECT 1 
    FROM public.delivery_requests dr
    JOIN public.delivery_providers dp ON (dp.id = dr.provider_id OR dp.user_id = dr.provider_id)
    WHERE dr.purchase_order_id = purchase_orders.id
    AND dp.user_id = auth.uid()
  )
  OR
  -- OR if purchase_orders.delivery_provider_id matches a delivery_provider.id where user_id = auth.uid()
  EXISTS (
    SELECT 1 FROM public.delivery_providers dp
    WHERE dp.id = purchase_orders.delivery_provider_id
    AND dp.user_id = auth.uid()
  )
);

-- Grant SELECT permission (should already be granted, but ensure it)
GRANT SELECT ON public.purchase_orders TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
