-- delivery_provider_queue: ensure authenticated can INSERT when policy allows (some DBs never had GRANT).
-- Broaden owner check: delivery_requests.builder_id may be auth.users.id or profiles.id.

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

-- Align notifications builder→provider branch with same builder_id semantics
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
);
