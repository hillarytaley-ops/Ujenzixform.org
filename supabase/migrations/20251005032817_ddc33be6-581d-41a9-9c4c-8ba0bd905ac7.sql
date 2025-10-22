-- ============================================================================
-- DELIVERY_COMMUNICATIONS RLS - Work with existing schema
-- sender_id is TEXT in existing table
-- ============================================================================

-- Enable RLS if not enabled
ALTER TABLE delivery_communications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "delivery_comms_public_read" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_unrestricted" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_sender_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_recipient_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_admin_view" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_send_message" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_update_own" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_block_anonymous" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_read" ON delivery_communications;
DROP POLICY IF EXISTS "delivery_comms_write" ON delivery_communications;

-- Helper function to check if user is involved in communication
CREATE OR REPLACE FUNCTION is_delivery_communication_participant(sender_type_param text, sender_id_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN sender_type_param = 'builder' THEN 
      EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id::text = sender_id_param)
    WHEN sender_type_param = 'provider' THEN
      EXISTS (SELECT 1 FROM delivery_providers WHERE user_id = auth.uid() AND id::text = sender_id_param)
    ELSE false
  END;
$$;

-- Sender can view sent messages
CREATE POLICY "delivery_comms_sender_view"
ON delivery_communications FOR SELECT
TO authenticated
USING (is_delivery_communication_participant(sender_type, sender_id));

-- Admins can view all messages
CREATE POLICY "delivery_comms_admin_view"
ON delivery_communications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can send messages
CREATE POLICY "delivery_comms_send_message"
ON delivery_communications FOR INSERT
TO authenticated
WITH CHECK (is_delivery_communication_participant(sender_type, sender_id));

-- Users can update own messages
CREATE POLICY "delivery_comms_update_own"
ON delivery_communications FOR UPDATE
TO authenticated
USING (
  is_delivery_communication_participant(sender_type, sender_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Block anonymous access
CREATE POLICY "delivery_comms_block_anonymous"
ON delivery_communications FOR ALL
TO anon
USING (false);