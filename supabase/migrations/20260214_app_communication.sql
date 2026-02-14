-- ============================================================
-- App Communication Tables
-- In-App Messaging and Voice/Video Calls
-- Created: February 14, 2026
-- ============================================================

-- ============================================================
-- 1. APP MESSAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS app_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    receiver_role TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for app_messages
CREATE INDEX IF NOT EXISTS idx_app_messages_sender ON app_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_app_messages_receiver ON app_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_app_messages_created ON app_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_messages_unread ON app_messages(receiver_id, is_read) WHERE is_read = FALSE;

-- RLS for app_messages
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
    ON app_messages FOR SELECT
    USING (
        sender_id = auth.uid()::text 
        OR receiver_id = auth.uid()::text
        OR receiver_id = 'admin'
        OR sender_id = 'admin'
    );

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
    ON app_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update messages"
    ON app_messages FOR UPDATE
    USING (
        receiver_id = auth.uid()::text 
        OR receiver_id = 'admin'
    );

-- ============================================================
-- 2. APP CALLS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS app_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id TEXT NOT NULL,
    caller_name TEXT NOT NULL,
    caller_role TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'missed', 'rejected')),
    call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for app_calls
CREATE INDEX IF NOT EXISTS idx_app_calls_caller ON app_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_app_calls_receiver ON app_calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_app_calls_status ON app_calls(status);
CREATE INDEX IF NOT EXISTS idx_app_calls_created ON app_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_calls_ringing ON app_calls(receiver_id, status) WHERE status = 'ringing';

-- RLS for app_calls
ALTER TABLE app_calls ENABLE ROW LEVEL SECURITY;

-- Users can view calls they made or received
CREATE POLICY "Users can view own calls"
    ON app_calls FOR SELECT
    USING (
        caller_id = auth.uid()::text 
        OR receiver_id = auth.uid()::text
        OR caller_id = 'admin'
        OR receiver_id = 'admin'
    );

-- Authenticated users can create calls
CREATE POLICY "Authenticated users can create calls"
    ON app_calls FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update calls they're part of
CREATE POLICY "Users can update own calls"
    ON app_calls FOR UPDATE
    USING (
        caller_id = auth.uid()::text 
        OR receiver_id = auth.uid()::text
        OR caller_id = 'admin'
        OR receiver_id = 'admin'
    );

-- ============================================================
-- 3. UPDATE TRIGGERS
-- ============================================================

-- Auto-update timestamps for app_messages
DROP TRIGGER IF EXISTS update_app_messages_updated_at ON app_messages;
CREATE TRIGGER update_app_messages_updated_at
    BEFORE UPDATE ON app_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-update timestamps for app_calls
DROP TRIGGER IF EXISTS update_app_calls_updated_at ON app_calls;
CREATE TRIGGER update_app_calls_updated_at
    BEFORE UPDATE ON app_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON app_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON app_calls TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
