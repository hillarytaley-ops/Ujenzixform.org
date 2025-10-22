-- Phase 2: Fix Delivery Tracking Only (investigating payment_contact_vault schema separately)
-- Fix 6: Reduce Driver Location Tracking Window (status-based, not time-based)

DROP POLICY IF EXISTS "tracking_builder_active_delivery_only" ON public.delivery_tracking;

CREATE POLICY "tracking_builder_status_based_only"
ON public.delivery_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND p.user_id = auth.uid()
      AND d.status IN ('in_progress', 'out_for_delivery') -- Only during active delivery
      -- No time window - purely status-based
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add policy for providers to update their own location
CREATE POLICY "tracking_provider_self_update"
ON public.delivery_tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    WHERE d.id = delivery_tracking.delivery_id
      AND d.status IN ('in_progress', 'out_for_delivery')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    WHERE d.id = delivery_tracking.delivery_id
      AND d.status IN ('in_progress', 'out_for_delivery')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

COMMENT ON TABLE delivery_tracking IS 'GPS tracking restricted to active delivery status only (in_progress, out_for_delivery). No time-based windows to prevent stalking.';