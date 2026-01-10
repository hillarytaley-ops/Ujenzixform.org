-- Fix Chat RLS Policies for Guest Users and Admin Access
-- This migration fixes issues where:
-- 1. Guest users cannot send messages (no auth.uid())
-- 2. Admins cannot see messages (user_roles table check failing)

-- =====================================================
-- DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "View messages in own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Insert messages in own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Staff can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;
DROP POLICY IF EXISTS "Staff can update conversations" ON conversations;

-- =====================================================
-- NEW PERMISSIVE POLICIES FOR CONVERSATIONS
-- =====================================================

-- Allow anyone to create conversations (for guest chat)
CREATE POLICY "Anyone can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Allow anyone to view conversations they're part of OR admins can view all
CREATE POLICY "View own or admin view all conversations" ON conversations
  FOR SELECT USING (
    client_id = auth.uid()
    OR client_id IS NULL  -- Guest conversations
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow staff/admins to update conversations
CREATE POLICY "Staff can update conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- NEW PERMISSIVE POLICIES FOR CHAT MESSAGES
-- =====================================================

-- Allow ANYONE to insert messages (including guests)
-- This is essential for the chat widget to work for non-authenticated users
CREATE POLICY "Anyone can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Allow viewing messages: own conversation OR admin
CREATE POLICY "View messages in conversations" ON chat_messages
  FOR SELECT USING (
    -- Check if user owns the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (
        c.client_id = auth.uid()
        OR c.client_id IS NULL  -- Guest conversations visible to all
      )
    )
    -- OR user is admin (check both profiles and user_roles tables)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow admins to update messages (mark as read)
CREATE POLICY "Admin can update chat messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- ENSURE REALTIME IS ENABLED
-- =====================================================
-- Re-add tables to realtime publication (safe to run multiple times)
DO $$
BEGIN
  -- Check if tables are already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- =====================================================
-- SET REPLICA IDENTITY FOR REALTIME
-- =====================================================
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Success message
SELECT 'Chat RLS policies fixed for guest and admin access!' as status;

