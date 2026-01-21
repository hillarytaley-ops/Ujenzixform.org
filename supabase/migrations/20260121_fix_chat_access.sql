-- =====================================================================
-- FIX CHAT ACCESS FOR ADMINS
-- =====================================================================
-- This ensures admins can see all conversations and messages
-- =====================================================================

-- First, let's check what's in user_roles for admin access
-- The issue might be that the admin check is failing

-- Drop all existing policies on conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_all" ON public.conversations;

-- Create simple, permissive policies for conversations
-- Allow anyone authenticated to INSERT
CREATE POLICY "conversations_insert"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow admins to SELECT all, others see their own
CREATE POLICY "conversations_select"
ON public.conversations FOR SELECT TO authenticated
USING (
    client_id::text = auth.uid()::text OR
    client_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Allow admins to UPDATE all, others update their own
CREATE POLICY "conversations_update"
ON public.conversations FOR UPDATE TO authenticated
USING (
    client_id::text = auth.uid()::text OR
    client_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- =====================================================================
-- CHAT_MESSAGES TABLE
-- =====================================================================

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_all" ON public.chat_messages;

-- Allow anyone authenticated to INSERT messages
CREATE POLICY "chat_messages_insert"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow viewing messages - admins see all, others see their own conversations
CREATE POLICY "chat_messages_select"
ON public.chat_messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id 
        AND (
            c.client_id::text = auth.uid()::text OR
            c.client_id IS NULL
        )
    ) OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Allow updating messages (for read status)
CREATE POLICY "chat_messages_update"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id 
        AND (
            c.client_id::text = auth.uid()::text OR
            c.client_id IS NULL
        )
    ) OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- =====================================================================
-- Ensure admin has proper role in user_roles table
-- =====================================================================

-- Make sure hillarytaley@gmail.com has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'hillarytaley@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com')
    AND role IN ('admin', 'super_admin')
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update profiles table if it exists
UPDATE public.profiles 
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com')
AND role NOT IN ('admin', 'super_admin');

SELECT 'Chat access policies fixed!' as result;

