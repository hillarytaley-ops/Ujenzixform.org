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

-- Update select policy to include anonymous access
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Staff can view all conversations" ON public.conversations;

-- Staff/Admin can see ALL conversations
CREATE POLICY "Staff can view all conversations"
ON public.conversations FOR SELECT
USING (
    -- Admins/staff see all conversations
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin', 'staff')) OR
    EXISTS (SELECT 1 FROM public.admin_staff s WHERE s.user_id = auth.uid())
);

-- Regular users see their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (
    -- Authenticated users see their own conversations
    (auth.uid() IS NOT NULL AND client_id::text = auth.uid()::text) OR
    -- Anonymous users with null client_id can see conversations (limited by conversation_id in app)
    (auth.uid() IS NULL AND client_id IS NULL)
);

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

-- Update select policy for anonymous access
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON public.chat_messages;

-- Staff/Admin can see ALL chat messages
CREATE POLICY "Staff can view all messages"
ON public.chat_messages FOR SELECT
USING (
    -- Admins/staff see all messages
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin', 'staff')) OR
    EXISTS (SELECT 1 FROM public.admin_staff s WHERE s.user_id = auth.uid())
);

-- Regular users see their own messages
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT
USING (
    -- Authenticated users see messages in their conversations
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND c.client_id::text = auth.uid()::text
    ) OR
    -- Anonymous access - allow reading messages (app filters by conversation_id)
    (auth.uid() IS NULL)
);

-- Update update policy
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages;

CREATE POLICY "Users can update messages"
ON public.chat_messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND c.client_id::text = auth.uid()::text
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

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
