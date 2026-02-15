-- ============================================================
-- Fix RLS Policies for Support Chat System
-- Allows users to create support chats and messages
-- Allows admin to view all chats and messages
-- Created: February 15, 2026
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Users can create support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Users can update own support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Admin can view all support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can view support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can create support chats" ON public.support_chats;

DROP POLICY IF EXISTS "Users can view own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admin can view all messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can view support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can create support messages" ON public.support_messages;

-- Enable RLS on tables
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUPPORT_CHATS Policies
-- ============================================================

-- Allow anyone to view support chats (admin needs to see all)
CREATE POLICY "Anyone can view support chats"
    ON public.support_chats FOR SELECT
    USING (true);

-- Allow authenticated users to create support chats
CREATE POLICY "Authenticated users can create support chats"
    ON public.support_chats FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own chats, and admin to update any
CREATE POLICY "Users can update support chats"
    ON public.support_chats FOR UPDATE
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM admin_staff 
            WHERE user_id = auth.uid() OR email = auth.jwt()->>'email'
        )
    );

-- ============================================================
-- SUPPORT_MESSAGES Policies
-- ============================================================

-- Allow anyone to view support messages (admin needs to see all)
CREATE POLICY "Anyone can view support messages"
    ON public.support_messages FOR SELECT
    USING (true);

-- Allow authenticated users to create messages
CREATE POLICY "Authenticated users can create support messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own messages
CREATE POLICY "Users can update own support messages"
    ON public.support_messages FOR UPDATE
    USING (sender_id = auth.uid());

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON public.support_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;

-- Also grant to anon for REST API access
GRANT SELECT ON public.support_chats TO anon;
GRANT SELECT ON public.support_messages TO anon;

-- ============================================================
-- Enable realtime for instant message delivery
-- ============================================================

-- Check if tables are already in publication before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'support_chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Tables might already be in publication
    NULL;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
