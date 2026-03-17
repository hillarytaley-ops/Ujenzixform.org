-- ============================================================
-- Ensure delivery requests show on Delivery Provider dashboard
-- Created: March 23, 2026
--
-- Problem: Delivery requests (Alerts tab) not showing because RLS
-- blocks visibility. Policies may require role='delivery_provider'
-- (user might have 'delivery') or only provider_id = self.
--
-- Fix: Single policy that allows ANY authenticated user to SELECT
-- rows where status IN ('pending','requested','assigned'), plus
-- rows assigned to this provider or owned by this builder.
-- No role check — any logged-in user can see pending requests.
-- ============================================================

-- Remove any restrictive provider policies
DROP POLICY IF EXISTS "delivery_requests_provider_access" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_view" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_pending" ON delivery_requests;

-- Create one clear policy: pending/requested/assigned visible to all authenticated
CREATE POLICY "delivery_requests_provider_view_pending" ON delivery_requests
FOR SELECT TO authenticated
USING (
  status IN ('pending', 'requested', 'assigned')
  OR provider_id IN (SELECT id FROM delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Ensure providers can UPDATE to accept
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON delivery_requests;

CREATE POLICY "delivery_requests_provider_update" ON delivery_requests
FOR UPDATE TO authenticated
USING (
  status IN ('pending', 'requested', 'assigned')
  OR provider_id IN (SELECT id FROM delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (auth.uid() IS NOT NULL);
