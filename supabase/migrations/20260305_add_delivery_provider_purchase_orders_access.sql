-- ============================================================
-- Add RLS Policy for Delivery Providers to Access Purchase Orders
-- This allows delivery providers to read po_number from purchase_orders
-- that are linked to delivery_requests they have access to
-- ============================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "purchase_orders_delivery_provider_access" ON public.purchase_orders;

-- Create policy for delivery providers to read purchase_orders
-- They can read purchase_orders that are linked to delivery_requests
-- where they are the assigned provider
CREATE POLICY "purchase_orders_delivery_provider_access" 
ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  -- Allow if there's a delivery_request with this purchase_order_id
  -- and the delivery provider is assigned to it
  EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.purchase_order_id = purchase_orders.id
    AND (
      -- Provider is assigned via provider_id
      dr.provider_id = auth.uid()
      OR
      -- Provider is assigned via delivery_providers table
      EXISTS (
        SELECT 1 FROM public.delivery_providers dp
        WHERE dp.id = dr.provider_id
        AND dp.user_id = auth.uid()
      )
      OR
      -- Provider is assigned via purchase_orders.delivery_provider_id
      purchase_orders.delivery_provider_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.delivery_providers dp
        WHERE dp.id = purchase_orders.delivery_provider_id
        AND dp.user_id = auth.uid()
      )
    )
  )
);

-- Grant SELECT permission (should already be granted, but ensure it)
GRANT SELECT ON public.purchase_orders TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
