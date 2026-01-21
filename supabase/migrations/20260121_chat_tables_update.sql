-- =====================================================================
-- CHAT TABLES UPDATE
-- =====================================================================
-- Adds missing columns to existing tables for enhanced chatbot features
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================================

-- Add missing columns to conversations table (if they don't exist)
DO $$ 
BEGIN
    -- Add rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'rating') THEN
        ALTER TABLE public.conversations ADD COLUMN rating INTEGER;
    END IF;
    
    -- Add rating_comment column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'rating_comment') THEN
        ALTER TABLE public.conversations ADD COLUMN rating_comment TEXT;
    END IF;
    
    -- Add closed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'closed_at') THEN
        ALTER TABLE public.conversations ADD COLUMN closed_at TIMESTAMPTZ;
    END IF;
    
    -- Add source column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'source') THEN
        ALTER TABLE public.conversations ADD COLUMN source TEXT DEFAULT 'chatbot';
    END IF;
    
    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'priority') THEN
        ALTER TABLE public.conversations ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    
    -- Add agent_typing column for real-time typing indicator
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'agent_typing') THEN
        ALTER TABLE public.conversations ADD COLUMN agent_typing BOOLEAN DEFAULT false;
    END IF;
    
    -- Add unread_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'unread_count') THEN
        ALTER TABLE public.conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_message column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'last_message') THEN
        ALTER TABLE public.conversations ADD COLUMN last_message TEXT;
    END IF;
    
    -- Add last_message_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'last_message_at') THEN
        ALTER TABLE public.conversations ADD COLUMN last_message_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add columns to admin_staff if they don't exist
DO $$ 
BEGIN
    -- Check if admin_staff table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'admin_staff') THEN
        
        -- Add is_online column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'admin_staff' 
                       AND column_name = 'is_online') THEN
            ALTER TABLE public.admin_staff ADD COLUMN is_online BOOLEAN DEFAULT false;
        END IF;
        
        -- Add can_handle_chat column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'admin_staff' 
                       AND column_name = 'can_handle_chat') THEN
            ALTER TABLE public.admin_staff ADD COLUMN can_handle_chat BOOLEAN DEFAULT true;
        END IF;
        
        -- Add last_active column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'admin_staff' 
                       AND column_name = 'last_active') THEN
            ALTER TABLE public.admin_staff ADD COLUMN last_active TIMESTAMPTZ;
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE public.admin_staff (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT,
            email TEXT,
            role TEXT DEFAULT 'support',
            is_online BOOLEAN DEFAULT false,
            can_handle_chat BOOLEAN DEFAULT true,
            last_active TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Enable RLS on admin_staff (safe even if already enabled)
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_staff (drop first if exists)
DROP POLICY IF EXISTS "Admins can view all staff" ON public.admin_staff;
CREATE POLICY "Admins can view all staff"
ON public.admin_staff FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Anyone can view online staff" ON public.admin_staff;
CREATE POLICY "Anyone can view online staff"
ON public.admin_staff FOR SELECT TO authenticated
USING (is_online = true);

-- Create chat_transcripts table for email feature
CREATE TABLE IF NOT EXISTS public.chat_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    transcript TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column if table already exists but column is missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chat_transcripts' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.chat_transcripts ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable RLS on chat_transcripts
ALTER TABLE public.chat_transcripts ENABLE ROW LEVEL SECURITY;

-- Create policy for chat_transcripts - users can only insert their own
DROP POLICY IF EXISTS "Users can insert own transcripts" ON public.chat_transcripts;
CREATE POLICY "Users can insert own transcripts"
ON public.chat_transcripts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can view all transcripts" ON public.chat_transcripts;
CREATE POLICY "Admins can view all transcripts"
ON public.chat_transcripts FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_staff_online ON public.admin_staff(is_online) WHERE is_online = true;

-- Comments
COMMENT ON TABLE public.admin_staff IS 'Staff members who can handle live chat';
COMMENT ON TABLE public.chat_transcripts IS 'Email transcripts of chat conversations';
COMMENT ON COLUMN public.conversations.rating IS 'User rating 1-5 stars';
COMMENT ON COLUMN public.conversations.agent_typing IS 'Real-time typing indicator';

SELECT 'Chat tables updated successfully' as result;

