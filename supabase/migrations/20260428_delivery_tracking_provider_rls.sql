-- Allow delivery providers to SELECT/INSERT delivery_tracking when they accept a delivery.
-- Fixes 403 on delivery_tracking GET/POST. App uses delivery_requests.id as delivery_id.
-- Replaces policies that depended on profiles.role (column dropped in later migration).

-- Ensure authenticated can access table (in case a prior migration revoked)
GRANT SELECT, INSERT, UPDATE ON delivery_tracking TO authenticated;

-- Drop policies that may block provider access or depend on profiles.role
DROP POLICY IF EXISTS "delivery_tracking_provider_select_own" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_provider_location_insert_2024" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_block_coordinates" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_provider_via_delivery_request" ON delivery_tracking;

-- Provider SELECT: allow when provider_id is this provider (no profiles.role)
CREATE POLICY "delivery_tracking_provider_select_own"
ON delivery_tracking FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid() AND dp.id = delivery_tracking.provider_id
  )
);

-- Provider INSERT: allow when provider_id is this provider
CREATE POLICY "delivery_tracking_provider_location_insert_2024"
ON delivery_tracking FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid() AND dp.id = delivery_tracking.provider_id
  )
);

-- Provider SELECT/INSERT by delivery_requests: app uses delivery_requests.id as delivery_id.
-- Allow when delivery_id is an accepted/assigned delivery_request for this provider.
CREATE POLICY "delivery_tracking_provider_via_delivery_request"
ON delivery_tracking FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.user_id = auth.uid()
      AND dr.id = delivery_tracking.delivery_id
      AND dr.status IN ('accepted', 'assigned', 'dispatched')
      AND delivery_tracking.provider_id = dp.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.user_id = auth.uid()
      AND dr.id = delivery_tracking.delivery_id
      AND dr.status IN ('accepted', 'assigned', 'dispatched')
      AND delivery_tracking.provider_id = dp.id
  )
);
