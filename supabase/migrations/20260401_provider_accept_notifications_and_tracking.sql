-- Fix provider accept flow: allow notifications insert and delivery_tracking for delivery providers
-- Resolves: 403 on notifications INSERT, 403 on delivery_tracking GET/POST when provider accepts delivery

-- 1. Allow delivery providers to insert notifications for builders when they accept a delivery
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_admin" ON notifications;

CREATE POLICY "notifications_insert"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can create notifications for themselves
  (user_id = auth.uid())
  -- OR admins can create notifications for any user
  OR (public.is_admin() = true)
  -- OR delivery providers can notify builders when accepting their delivery
  OR (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN delivery_providers dp ON (dp.id = dr.provider_id OR dp.user_id = dr.provider_id)
      WHERE dp.user_id = auth.uid()
        AND dr.status IN ('accepted', 'assigned')
        AND (
          dr.builder_id = notifications.user_id
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = dr.builder_id AND p.user_id = notifications.user_id)
        )
    )
  )
);

-- 2. Allow delivery providers to SELECT delivery_tracking for their accepted deliveries
-- (delivery_tracking_gps_admin_only_2024 may block all SELECT; add provider SELECT)
DO $$
BEGIN
  DROP POLICY IF EXISTS "delivery_tracking_provider_select_own" ON delivery_tracking;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "delivery_tracking_provider_select_own"
ON delivery_tracking FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid()
    AND dp.id = delivery_tracking.provider_id
  )
);

-- 3. Allow delivery providers to INSERT - provider_id can be delivery_providers.id
--    App must pass delivery_providers.id; if app passes auth.uid(), add policy to allow that too
DROP POLICY IF EXISTS "delivery_tracking_provider_location_insert_2024" ON delivery_tracking;

CREATE POLICY "delivery_tracking_provider_location_insert_2024"
ON delivery_tracking FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid()
    AND dp.id = delivery_tracking.provider_id
  )
);
