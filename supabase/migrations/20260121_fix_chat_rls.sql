-- =====================================================================
-- FIX CHAT RLS POLICIES
-- =====================================================================
-- Ensures conversations and chat_messages can be created by users
-- and viewed by admins for the live chat feature
-- =====================================================================

-- =====================================================================
-- CONVERSATIONS TABLE RLS
-- =====================================================================

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Allow any authenticated user to create a conversation (for live chat)
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
    -- User can create conversation for themselves
    client_id = auth.uid() OR client_id IS NULL
);

-- Allow users to view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
    client_id = auth.uid() OR
    agent_id = auth.uid() OR
    -- Admins can view all
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Allow users to update their own conversations
CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (
    client_id = auth.uid() OR
    agent_id = auth.uid() OR
    -- Admins can update all
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
)
WITH CHECK (
    client_id = auth.uid() OR
    agent_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- =====================================================================
-- CHAT_MESSAGES TABLE RLS
-- =====================================================================

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;

-- Allow authenticated users to insert messages
CREATE POLICY "Authenticated users can insert messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
    -- User is the sender
    sender_id = auth.uid() OR 
    sender_id IS NULL OR
    -- Or user is admin/staff
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Allow users to view messages in their conversations
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
    -- User is participant in the conversation
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.agent_id = auth.uid())
    ) OR
    -- Or user is admin
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Allow users to update messages (for read status)
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages;
CREATE POLICY "Users can update messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.agent_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- =====================================================================
-- CHAT_FEEDBACK TABLE RLS
-- =====================================================================

-- Enable RLS
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own chat feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Admins can view all chat feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chat_feedback;

-- Allow authenticated users to insert feedback
CREATE POLICY "Users can insert feedback"
ON public.chat_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow admins to view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.chat_feedback FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- =====================================================================
-- VERIFY TABLES EXIST
-- =====================================================================

-- Ensure chat_feedback has required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chat_feedback' 
                   AND column_name = 'message_content') THEN
        ALTER TABLE public.chat_feedback ADD COLUMN message_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chat_feedback' 
                   AND column_name = 'metadata') THEN
        ALTER TABLE public.chat_feedback ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Grant usage on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

SELECT 'Chat RLS policies fixed successfully!' as result;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('conversations', 'chat_messages', 'chat_feedback')
ORDER BY tablename, policyname;

