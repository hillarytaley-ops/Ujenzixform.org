-- Fix private_client / builder flow when notifying delivery providers:
-- 1) Allow INSERT into delivery_provider_queue when the row belongs to the user's delivery request.
-- 2) Extend notifications INSERT so builders can create in-app rows for providers (type delivery_request).

-- ---------------------------------------------------------------------------
-- delivery_provider_queue: INSERT for request owner (builder_id = auth.uid())
-- ---------------------------------------------------------------------------
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
      AND dr.builder_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- notifications: keep existing insert rules and add builder → provider job alerts
-- ---------------------------------------------------------------------------
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
      WHERE dr.builder_id = auth.uid()
        AND dr.id::text = coalesce(notifications.data->>'request_id', '')
    )
    AND EXISTS (
      SELECT 1 FROM public.delivery_providers dp
      WHERE dp.user_id = notifications.user_id
    )
  )
);
