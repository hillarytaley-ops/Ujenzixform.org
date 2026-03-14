-- ============================================================
-- Fix RLS Policy for delivery_requests to allow ALL delivery providers
-- to see ALL pending requests (regardless of provider_id)
-- Created: March 15, 2026
-- ============================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON delivery_requests;

-- Create a more permissive policy that allows ALL authenticated delivery providers
-- to see ALL pending requests (so they can accept them)
CREATE POLICY "delivery_requests_provider_view_pending" ON delivery_requests
FOR SELECT TO authenticated
USING (
  -- ALL pending requests are visible to ALL delivery providers (for first-come-first-served)
  status = 'pending'
  OR
  -- Requests assigned to this provider (by provider_id matching delivery_providers.id)
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = auth.uid())
  OR
  -- Requests assigned to this provider (by provider_id directly matching user_id)
  provider_id = auth.uid()
  OR
  -- Builders can see their own requests
  builder_id = auth.uid()
  OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Also ensure delivery providers can update pending requests (to accept them)
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON delivery_requests;

CREATE POLICY "delivery_requests_provider_update" ON delivery_requests
FOR UPDATE TO authenticated
USING (
  -- Can update pending requests (to accept them)
  status = 'pending'
  OR
  -- Can update requests assigned to them
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = auth.uid())
  OR
  provider_id = auth.uid()
  OR
  -- Builders can update their own requests
  builder_id = auth.uid()
  OR
  builder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- Migration Complete
-- ============================================================
