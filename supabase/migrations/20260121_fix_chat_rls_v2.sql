-- =====================================================================
-- FIX CHAT RLS POLICIES v2
-- =====================================================================
-- Fixed type casting for client_id comparisons
-- =====================================================================

-- Add missing columns to conversations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'agent_id') THEN
        ALTER TABLE public.conversations ADD COLUMN agent_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'agent_name') THEN
        ALTER TABLE public.conversations ADD COLUMN agent_name TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_read" ON public.conversations;
DROP POLICY IF EXISTS "allow_insert" ON public.conversations;
DROP POLICY IF EXISTS "allow_update" ON public.conversations;

-- Allow authenticated users to create conversations
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
    client_id::text = auth.uid()::text OR client_id IS NULL
);

-- Allow users to view their own conversations (admins see all)
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
    client_id::text = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Allow users to update their own conversations (admins update all)
CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (
    client_id::text = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- =====================================================================
-- CHAT_MESSAGES TABLE
-- =====================================================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_read" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_insert" ON public.chat_messages;

-- Allow authenticated users to insert messages
CREATE POLICY "Authenticated users can insert messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
    sender_id::text = auth.uid()::text OR 
    sender_id IS NULL OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Allow users to view messages in their conversations (admins see all)
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND c.client_id::text = auth.uid()::text
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Allow users to update messages (for read status)
CREATE POLICY "Users can update messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND c.client_id::text = auth.uid()::text
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- =====================================================================
-- CHAT_FEEDBACK TABLE
-- =====================================================================

ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own chat feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Admins can view all chat feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.chat_feedback;

-- Allow authenticated users to insert feedback
CREATE POLICY "Users can insert feedback"
ON public.chat_feedback FOR INSERT TO authenticated
WITH CHECK (user_id::text = auth.uid()::text OR user_id IS NULL);

-- Allow admins to view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.chat_feedback FOR SELECT TO authenticated
USING (
    user_id::text = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- =====================================================================
-- Ensure chat_feedback has required columns
-- =====================================================================
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

SELECT 'Chat RLS policies fixed successfully!' as result;

