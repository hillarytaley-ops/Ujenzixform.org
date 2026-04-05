-- Re-apply notifications + delivery_provider_queue INSERT policies so builder→provider
-- delivery_request notifications work even if an intermediate migration (e.g. 20260401)
-- left policies without the delivery_request branch, or remote DB skipped 202604041800.
-- builder_id on delivery_requests references profiles.id; owners are matched via profiles.user_id = auth.uid().

-- ── notifications ───────────────────────────────────────────────────────────
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

-- ── delivery_provider_queue (GRANT + INSERT policy) ─────────────────────────
GRANT INSERT ON public.delivery_provider_queue TO authenticated;

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
);

NOTIFY pgrst, 'reload schema';
