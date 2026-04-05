-- Allow admins to INSERT delivery_request notifications for any existing delivery_requests row
-- (e.g. "Alert nearby drivers" from staff dashboard). Builder branch still applies for builders.

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  OR (public.is_admin() = true)
  OR (
    EXISTS (
      SELECT 1
      FROM public.delivery_requests dr
      JOIN public.delivery_providers dp
        ON (dp.id = dr.provider_id OR dp.user_id = dr.provider_id)
      WHERE dp.user_id = auth.uid()
        AND dr.status IN ('accepted', 'assigned')
        AND (
          dr.builder_id = notifications.user_id
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = dr.builder_id AND p.user_id = notifications.user_id
          )
        )
    )
  )
  OR (
    notifications.type = 'delivery_request'
    AND EXISTS (
      SELECT 1
      FROM public.delivery_requests dr
      WHERE (
        dr.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = dr.builder_id AND p.user_id = auth.uid()
        )
      )
        AND dr.id::text = coalesce(notifications.data->>'request_id', '')
    )
    AND EXISTS (
      SELECT 1 FROM public.delivery_providers dp
      WHERE dp.user_id = notifications.user_id
    )
  )
  OR (
    public.is_admin() = true
    AND notifications.type = 'delivery_request'
    AND EXISTS (
      SELECT 1
      FROM public.delivery_requests dr
      WHERE dr.id::text = coalesce(notifications.data->>'request_id', '')
    )
    AND EXISTS (
      SELECT 1 FROM public.delivery_providers dp
      WHERE dp.user_id = notifications.user_id
    )
  )
  OR (
    notifications.type = 'invoice_pay_builder_prompt'
    AND EXISTS (
      SELECT 1
      FROM public.invoices inv
      JOIN public.purchase_orders po ON po.id = inv.purchase_order_id
      JOIN public.suppliers s ON s.id = inv.supplier_id
      WHERE inv.id::text = coalesce(notifications.data->>'invoice_id', '')
        AND inv.status = 'sent'
        AND po.delivery_provider_id IS NOT NULL
        AND notifications.user_id = po.delivery_provider_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = s.user_id AND p.user_id = auth.uid()
          )
        )
    )
  )
);

-- Queue rows: admins may insert for any delivery_request (staff broadcast).
DROP POLICY IF EXISTS "Builders can insert queue rows for own delivery requests" ON public.delivery_provider_queue;

CREATE POLICY "Builders can insert queue rows for own delivery requests"
ON public.delivery_provider_queue
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.delivery_requests dr
    WHERE dr.id = delivery_provider_queue.request_id
      AND (
        dr.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = dr.builder_id AND p.user_id = auth.uid()
        )
      )
  )
  OR (
    public.is_admin() = true
    AND EXISTS (
      SELECT 1
      FROM public.delivery_requests dr
      WHERE dr.id = delivery_provider_queue.request_id
    )
  )
);

NOTIFY pgrst, 'reload schema';
