-- =====================================================================
-- ADD MISSING COLUMNS TO CONVERSATIONS TABLE
-- =====================================================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'metadata') THEN
        ALTER TABLE public.conversations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'last_message') THEN
        ALTER TABLE public.conversations ADD COLUMN last_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'last_message_at') THEN
        ALTER TABLE public.conversations ADD COLUMN last_message_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'unread_count') THEN
        ALTER TABLE public.conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'priority') THEN
        ALTER TABLE public.conversations ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'source') THEN
        ALTER TABLE public.conversations ADD COLUMN source TEXT DEFAULT 'chatbot';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'rating') THEN
        ALTER TABLE public.conversations ADD COLUMN rating INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'rating_comment') THEN
        ALTER TABLE public.conversations ADD COLUMN rating_comment TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'closed_at') THEN
        ALTER TABLE public.conversations ADD COLUMN closed_at TIMESTAMPTZ;
    END IF;
END $$;

SELECT 'Metadata column added!' as result;

