-- ============================================================
-- Fix RLS Policy for delivery_requests to handle provider_id correctly
-- provider_id can be either delivery_providers.id OR delivery_providers.user_id
-- Created: March 5, 2026
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Delivery providers can view pending requests" ON delivery_requests;
DROP POLICY IF EXISTS "Delivery providers can update requests" ON delivery_requests;

-- Policy 1: Delivery providers can view requests assigned to them
-- Handles both cases: provider_id = auth.uid() OR provider_id = delivery_providers.id where user_id = auth.uid()
CREATE POLICY "Delivery providers can view assigned requests"
ON delivery_requests FOR SELECT
USING (
  -- Pending requests with no provider assigned - visible to all delivery providers
  (status = 'pending' AND provider_id IS NULL)
  OR
  -- Requests assigned to this provider by user_id
  provider_id = auth.uid()
  OR
  -- Requests assigned to this provider by delivery_providers.id
  EXISTS (
    SELECT 1
    FROM delivery_providers dp
    WHERE dp.id = delivery_requests.provider_id
      AND dp.user_id = auth.uid()
  )
);

-- Policy 2: Delivery providers can update requests
CREATE POLICY "Delivery providers can update assigned requests"
ON delivery_requests FOR UPDATE
USING (
  -- Can update pending requests (to accept them)
  (status = 'pending' AND provider_id IS NULL)
  OR
  -- Can update requests assigned to this provider by user_id
  provider_id = auth.uid()
  OR
  -- Can update requests assigned to this provider by delivery_providers.id
  EXISTS (
    SELECT 1
    FROM delivery_providers dp
    WHERE dp.id = delivery_requests.provider_id
      AND dp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT SELECT, UPDATE ON delivery_requests TO authenticated;

COMMENT ON POLICY "Delivery providers can view assigned requests" ON delivery_requests IS 
'Allows delivery providers to view pending requests (for first-come-first-served) and requests assigned to them (by user_id or delivery_providers.id)';
