-- Create chat_messages table for live chat between clients and staff
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    user_email TEXT,
    message TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'staff')),
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    needs_staff_reply BOOLEAN DEFAULT false,
    read_by_staff BOOLEAN DEFAULT false,
    read_by_user BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_needs_reply ON public.chat_messages(needs_staff_reply) WHERE needs_staff_reply = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own session messages
CREATE POLICY "Users can view own session messages" ON public.chat_messages
    FOR SELECT USING (
        session_id = current_setting('request.headers', true)::json->>'x-session-id'
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Anyone can insert messages (for guest users too)
CREATE POLICY "Anyone can insert messages" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

-- Policy: Staff/Admin can update messages (mark as read, etc.)
CREATE POLICY "Staff can update messages" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_messages_updated_at();

-- Grant permissions
GRANT ALL ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO anon;

COMMENT ON TABLE public.chat_messages IS 'Stores chat messages between clients and staff, including AI bot responses';

