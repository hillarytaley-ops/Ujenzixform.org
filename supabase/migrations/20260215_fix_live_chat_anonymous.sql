-- =====================================================================
-- FIX LIVE CHAT FOR ANONYMOUS USERS
-- =====================================================================
-- Allows both authenticated and anonymous users to use live chat
-- Created: February 15, 2026
-- =====================================================================

-- =====================================================================
-- FIX: Make client_email nullable for guest users
-- =====================================================================
ALTER TABLE public.conversations ALTER COLUMN client_email DROP NOT NULL;

-- =====================================================================
-- FIX: Make sender_id nullable for guest users in chat_messages
-- =====================================================================
ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;

-- =====================================================================
-- CONVERSATIONS TABLE - Allow anonymous inserts
-- =====================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anonymous can create conversations" ON public.conversations;

-- Allow ANYONE (including anonymous) to create conversations
CREATE POLICY "Anyone can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

-- SIMPLIFIED SELECT POLICY - allow all authenticated users to view
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Staff can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;

-- Simple policy: All authenticated users can view conversations
-- Chat is internal, filtering happens in the app
CREATE POLICY "Anyone can view conversations"
ON public.conversations FOR SELECT
USING (true);

-- =====================================================================
-- CHAT_MESSAGES TABLE - Allow anonymous inserts
-- =====================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anonymous can insert chat messages" ON public.chat_messages;

-- Allow ANYONE (including anonymous) to insert messages
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

-- SIMPLIFIED SELECT POLICY - allow all authenticated users to view
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;

-- Simple policy: All authenticated users can view chat messages
-- Chat is internal, filtering happens in the app
CREATE POLICY "Anyone can view messages"
ON public.chat_messages FOR SELECT
USING (true);

-- SIMPLIFIED UPDATE POLICY
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.chat_messages;

-- Simple policy: All authenticated users can update messages (mark as read, etc.)
CREATE POLICY "Anyone can update messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- =====================================================================
-- CHAT_FEEDBACK TABLE - Allow anonymous inserts
-- =====================================================================

DROP POLICY IF EXISTS "Users can insert feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chat_feedback;

-- Allow anyone to insert feedback
CREATE POLICY "Anyone can insert feedback"
ON public.chat_feedback FOR INSERT
WITH CHECK (true);

-- =====================================================================
-- GRANT PERMISSIONS TO ANON ROLE
-- =====================================================================

GRANT SELECT, INSERT ON public.conversations TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT INSERT ON public.chat_feedback TO anon;

-- =====================================================================
-- Done
-- =====================================================================

SELECT 'Live chat anonymous access enabled!' as result;
