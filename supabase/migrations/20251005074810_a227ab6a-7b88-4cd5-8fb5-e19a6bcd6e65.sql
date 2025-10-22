-- Remove driver contact fields from deliveries table
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_phone;
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_name;

-- Add time-limited builder access to driver contact data
CREATE POLICY "driver_contact_builder_time_limited" ON public.driver_contact_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.id = d.builder_id
      WHERE d.id = driver_contact_data.delivery_id
      AND p.user_id = auth.uid()
      AND driver_contact_data.access_expires_at > now()
      AND d.status IN ('in_progress', 'out_for_delivery', 'delivered')
    )
  );

-- Add time-limited builder access to delivery tracking (2 hours after delivery)
CREATE POLICY "tracking_builder_time_limited" ON public.delivery_tracking FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.id = d.builder_id
      WHERE d.id = delivery_tracking.delivery_id
      AND p.user_id = auth.uid()
      AND (
        d.status IN ('pending', 'confirmed', 'in_progress', 'out_for_delivery')
        OR (
          d.status = 'delivered'
          AND d.actual_delivery_time IS NOT NULL
          AND d.actual_delivery_time + INTERVAL '2 hours' > now()
        )
      )
    )
  );