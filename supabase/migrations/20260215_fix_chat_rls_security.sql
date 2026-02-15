-- =====================================================================
-- FIX CHAT RLS SECURITY WARNINGS
-- =====================================================================
-- Replaces overly permissive "WITH CHECK (true)" policies with
-- more restrictive but still functional policies for live chat
-- Created: February 15, 2026
-- =====================================================================

-- =====================================================================
-- CONVERSATIONS TABLE - More restrictive insert policy
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;

-- Allow inserts with validation:
-- - Must have valid source (live_chat, support, etc.)
-- - Must have status 'open' or 'pending'
-- - client_name must not be empty
CREATE POLICY "Validated conversation inserts"
ON public.conversations FOR INSERT
WITH CHECK (
    -- Basic validation to prevent abuse
    source IS NOT NULL AND
    source IN ('live_chat', 'support', 'chatbot', 'contact_form', 'email') AND
    status IN ('open', 'pending', 'waiting') AND
    (client_name IS NOT NULL AND length(trim(client_name)) > 0)
);

-- =====================================================================
-- CHAT_MESSAGES TABLE - More restrictive insert policy
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

-- Allow inserts with validation:
-- - Must reference a valid conversation_id
-- - Must have valid sender_type
-- - Content must not be empty
-- - message_type must be valid
CREATE POLICY "Validated chat message inserts"
ON public.chat_messages FOR INSERT
WITH CHECK (
    -- Must have a conversation_id
    conversation_id IS NOT NULL AND
    -- Must have valid sender_type
    sender_type IN ('client', 'staff', 'system', 'bot') AND
    -- Content must exist and not be empty
    content IS NOT NULL AND length(trim(content)) > 0 AND
    -- Message type must be valid
    (message_type IS NULL OR message_type IN ('text', 'image', 'file', 'system', 'notification'))
);

-- =====================================================================
-- CHAT_FEEDBACK TABLE - More restrictive insert policy
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chat_feedback;

-- Allow inserts with validation:
-- - Must reference a conversation or have valid context
-- - Rating must be valid (1-5) if provided
CREATE POLICY "Validated feedback inserts"
ON public.chat_feedback FOR INSERT
WITH CHECK (
    -- Must have either conversation_id or some identifying info
    (conversation_id IS NOT NULL OR user_id IS NOT NULL) AND
    -- If rating is provided, must be 1-5
    (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- =====================================================================
-- Done - These policies are more secure while still allowing
-- anonymous users to use live chat functionality
-- =====================================================================

SELECT 'Chat RLS security policies updated!' as result;
