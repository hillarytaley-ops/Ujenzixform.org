-- ============================================================================
-- DELIVERY_COMMUNICATIONS RLS - Fixed ambiguous column references
-- ============================================================================

ALTER TABLE delivery_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_comms_public_read" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_unrestricted" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_sender_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_recipient_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_admin_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_send_message" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_update_own" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_block_anonymous" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_update" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_insert" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_participant_view" ON delivery_communications;

-- Builders and providers can view messages from their delivery requests
CREATE POLICY "delivery_comms_participant_view"
ON delivery_communications FOR SELECT
TO authenticated
USING (
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN profiles p ON p.id = dr.builder_id
    WHERE p.user_id = auth.uid()
  ) OR
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.user_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "delivery_comms_admin_view"
ON delivery_communications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Builders and providers can send messages
CREATE POLICY "delivery_comms_send_message"
ON delivery_communications FOR INSERT
TO authenticated
WITH CHECK (
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN profiles p ON p.id = dr.builder_id
    WHERE p.user_id = auth.uid()
  ) OR
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.user_id = auth.uid()
  )
);

-- Participants can update messages (mark as read)
CREATE POLICY "delivery_comms_update_own"
ON delivery_communications FOR UPDATE
TO authenticated
USING (
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN profiles p ON p.id = dr.builder_id
    WHERE p.user_id = auth.uid()
  ) OR
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN delivery_providers dp ON dp.id = dr.provider_id
    WHERE dp.user_id = auth.uid()
  )
);

-- Block anonymous access
CREATE POLICY "delivery_comms_block_anonymous"
ON delivery_communications FOR ALL
TO anon
USING (false);