-- When a supplier forwards an invoice to the professional builder, delivery providers
-- assigned on the purchase order need in-app visibility + a path to act (Pay tab).
-- 1) Allow providers to SELECT invoices linked to POs where they are delivery_provider_id.
-- 2) Allow suppliers to INSERT notifications for that provider (validated against invoice + PO).

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

DROP POLICY IF EXISTS "invoices_select_delivery_provider_assigned_po" ON public.invoices;

CREATE POLICY "invoices_select_delivery_provider_assigned_po"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = invoices.purchase_order_id
      AND po.delivery_provider_id IS NOT NULL
      AND po.delivery_provider_id = auth.uid()
  )
);

COMMENT ON POLICY "invoices_select_delivery_provider_assigned_po" ON public.invoices IS
  'Drivers see invoices for orders they delivered (PO.delivery_provider_id = auth.uid()).';
