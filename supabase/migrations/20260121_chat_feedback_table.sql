-- =====================================================================
-- CHAT FEEDBACK TABLE
-- =====================================================================
-- Stores user feedback on chatbot responses for improvement
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
    message_content TEXT,
    user_query TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own feedback"
ON public.chat_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all feedback"
ON public.chat_feedback FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON public.chat_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created ON public.chat_feedback(created_at);

-- Comment
COMMENT ON TABLE public.chat_feedback IS 'Stores user feedback on chatbot responses for continuous improvement';

