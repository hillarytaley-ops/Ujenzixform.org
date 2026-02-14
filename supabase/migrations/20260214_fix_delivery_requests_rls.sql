-- ============================================================
-- Fix RLS Policies for delivery_requests table
-- Allow delivery providers to see pending requests
-- Created: February 14, 2026
-- ============================================================

-- First, drop existing policies that might be blocking
DROP POLICY IF EXISTS "Builders can view own delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Builders can create delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Delivery providers can view assigned requests" ON delivery_requests;
DROP POLICY IF EXISTS "Delivery providers can update assigned requests" ON delivery_requests;
DROP POLICY IF EXISTS "Delivery providers can view pending requests" ON delivery_requests;
DROP POLICY IF EXISTS "Anyone can view pending delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Authenticated users can view delivery requests" ON delivery_requests;

-- Enable RLS if not already enabled
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Builders can view their own delivery requests
CREATE POLICY "Builders can view own delivery requests"
ON delivery_requests FOR SELECT
USING (
    builder_id = auth.uid() 
    OR builder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Policy 2: Builders can create delivery requests
CREATE POLICY "Builders can create delivery requests"
ON delivery_requests FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Policy 3: CRITICAL - Delivery providers can view ALL pending requests (no provider assigned yet)
-- This allows the first-come-first-served model
CREATE POLICY "Delivery providers can view pending requests"
ON delivery_requests FOR SELECT
USING (
    -- Pending requests with no provider assigned - visible to all delivery providers
    (status = 'pending' AND provider_id IS NULL)
    OR
    -- Requests assigned to this provider
    provider_id = auth.uid()
);

-- Policy 4: Delivery providers can update requests (to accept them)
CREATE POLICY "Delivery providers can update requests"
ON delivery_requests FOR UPDATE
USING (
    -- Can update pending requests (to accept them)
    (status = 'pending' AND provider_id IS NULL)
    OR
    -- Can update their own assigned requests
    provider_id = auth.uid()
)
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Policy 5: Admin can do everything
CREATE POLICY "Admin full access to delivery requests"
ON delivery_requests FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================================
-- Also fix deliveries table RLS
-- ============================================================

DROP POLICY IF EXISTS "Delivery providers can view pending deliveries" ON deliveries;
DROP POLICY IF EXISTS "Anyone can view pending deliveries" ON deliveries;

-- Enable RLS if not already enabled
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Allow delivery providers to see pending deliveries
CREATE POLICY "Delivery providers can view pending deliveries"
ON deliveries FOR SELECT
USING (
    -- Pending deliveries with no provider - visible to all delivery providers
    (status = 'pending' AND provider_id IS NULL)
    OR
    -- Assigned to this provider
    provider_id = auth.uid()
    OR
    -- Created by this user
    auth.uid() = builder_id
);

-- Allow delivery providers to update deliveries
CREATE POLICY "Delivery providers can update deliveries"
ON deliveries FOR UPDATE
USING (
    (status = 'pending' AND provider_id IS NULL)
    OR
    provider_id = auth.uid()
)
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- ============================================================
-- Also fix delivery_notifications table RLS
-- ============================================================

DROP POLICY IF EXISTS "Delivery providers can view notifications" ON delivery_notifications;
DROP POLICY IF EXISTS "Anyone can view delivery notifications" ON delivery_notifications;

-- Enable RLS if not already enabled  
ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Allow delivery providers to see all delivery notifications
CREATE POLICY "Delivery providers can view notifications"
ON delivery_notifications FOR SELECT
USING (
    -- All pending/notified notifications visible to delivery providers
    status IN ('pending', 'notified')
    OR
    -- Their own notifications
    provider_id = auth.uid()
);

-- Allow updates to delivery notifications
CREATE POLICY "Delivery providers can update notifications"
ON delivery_notifications FOR UPDATE
USING (
    status IN ('pending', 'notified')
    OR
    provider_id = auth.uid()
)
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON delivery_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_notifications TO authenticated;

-- ============================================================
-- Verify: Check if there are any delivery requests
-- ============================================================
-- Run this to check: SELECT * FROM delivery_requests ORDER BY created_at DESC LIMIT 10;

COMMENT ON TABLE delivery_requests IS 'Delivery requests from builders. Pending requests visible to all delivery providers for first-come-first-served acceptance.';
