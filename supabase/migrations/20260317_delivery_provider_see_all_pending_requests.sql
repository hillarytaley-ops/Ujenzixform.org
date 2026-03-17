-- ============================================================
-- Ensure ALL pending/requested/assigned delivery requests appear
-- on the Delivery Provider dashboard (Alerts/Notifications)
-- Created: March 17, 2026
--
-- Problem: Some delivery requests with status "Awaiting Delivery Provider"
-- did not appear on the provider dashboard because RLS only allowed
-- rows where provider_id = current provider. Unassigned requests have
-- provider_id NULL, so they were hidden.
--
-- Fix: Drop any restrictive provider policy and ensure providers can
-- SELECT/UPDATE rows where status IN ('pending','requested','assigned')
-- so they can see and accept unassigned requests.
-- ============================================================

-- 1. Remove the restrictive "assigned only" policy if it exists
--    (from 20260204_fix_auth_rls_initplan - only allowed provider_id = self)
DROP POLICY IF EXISTS "delivery_requests_provider_access" ON delivery_requests;

-- 2. Replace the view policy so providers see ALL pending/requested/assigned
DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON delivery_requests;

CREATE POLICY "delivery_requests_provider_view_pending" ON delivery_requests
FOR SELECT TO authenticated
USING (
  -- Unassigned or assigned: show all pending/requested/assigned to every authenticated user
  -- (Delivery dashboard filters by provider in app; RLS allows rows to be visible)
  status IN ('pending', 'requested', 'assigned')
  OR
  -- Requests assigned to this provider (delivery_providers.id)
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = (SELECT auth.uid()))
  OR
  -- Legacy: provider_id stored as user_id
  provider_id = (SELECT auth.uid())
  OR
  -- Builders see their own
  builder_id = (SELECT auth.uid())
  OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
);

-- 3. Ensure providers can UPDATE pending/requested/assigned (to accept)
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON delivery_requests;

CREATE POLICY "delivery_requests_provider_update" ON delivery_requests
FOR UPDATE TO authenticated
USING (
  status IN ('pending', 'requested', 'assigned')
  OR
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = (SELECT auth.uid()))
  OR
  provider_id = (SELECT auth.uid())
  OR
  builder_id = (SELECT auth.uid())
  OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
);

COMMENT ON POLICY "delivery_requests_provider_view_pending" ON delivery_requests IS
'Allows delivery providers and builders to see pending/requested/assigned requests so providers can accept them on the dashboard.';
