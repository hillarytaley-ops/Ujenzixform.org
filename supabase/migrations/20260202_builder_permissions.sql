-- ============================================================
-- UjenziXform Database Migration
-- Builder Permissions & Contact Features
-- Created: February 2, 2026
-- ============================================================

-- ============================================================
-- 1. BUILDER INBOX MESSAGES
-- ============================================================

-- Direct messages between users and builders
CREATE TABLE IF NOT EXISTS builder_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'inquiry')),
    file_url TEXT,
    file_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (sender_id != recipient_id)
);

-- Conversations table for organizing messages
CREATE TABLE IF NOT EXISTS builder_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_id UUID,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    participant_1_unread INTEGER DEFAULT 0,
    participant_2_unread INTEGER DEFAULT 0,
    is_archived_1 BOOLEAN DEFAULT FALSE,
    is_archived_2 BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_1, participant_2),
    CHECK (participant_1 < participant_2) -- Ensure consistent ordering
);

-- Contact inquiries (for non-logged-in users or formal inquiries)
CREATE TABLE IF NOT EXISTS builder_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    inquiry_type TEXT DEFAULT 'general' CHECK (inquiry_type IN ('general', 'quote_request', 'project_inquiry', 'partnership', 'complaint')),
    project_details JSONB,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    replied_at TIMESTAMPTZ,
    reply_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone call logs (optional tracking)
CREATE TABLE IF NOT EXISTS builder_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    caller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    caller_name TEXT,
    caller_phone TEXT,
    call_type TEXT DEFAULT 'outbound' CHECK (call_type IN ('outbound', 'callback_request')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_builder_messages_conversation ON builder_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_builder_messages_sender ON builder_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_builder_messages_recipient ON builder_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_builder_messages_created ON builder_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_conversations_participants ON builder_conversations(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_builder_inquiries_builder ON builder_inquiries(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_inquiries_status ON builder_inquiries(status);

-- ============================================================
-- 2. ENHANCED PROFILE FIELDS FOR BUILDERS
-- ============================================================

DO $$ 
BEGIN
    -- Contact preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'show_phone') THEN
        ALTER TABLE profiles ADD COLUMN show_phone BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
        ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'allow_messages') THEN
        ALTER TABLE profiles ADD COLUMN allow_messages BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'allow_calls') THEN
        ALTER TABLE profiles ADD COLUMN allow_calls BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Social links
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'facebook_url') THEN
        ALTER TABLE profiles ADD COLUMN facebook_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'twitter_url') THEN
        ALTER TABLE profiles ADD COLUMN twitter_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'instagram_url') THEN
        ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'linkedin_url') THEN
        ALTER TABLE profiles ADD COLUMN linkedin_url TEXT;
    END IF;
    
    -- Business details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'years_experience') THEN
        ALTER TABLE profiles ADD COLUMN years_experience INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'team_size') THEN
        ALTER TABLE profiles ADD COLUMN team_size INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'service_areas') THEN
        ALTER TABLE profiles ADD COLUMN service_areas TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'certifications') THEN
        ALTER TABLE profiles ADD COLUMN certifications TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'specialties') THEN
        ALTER TABLE profiles ADD COLUMN specialties TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'price_range') THEN
        ALTER TABLE profiles ADD COLUMN price_range TEXT;
    END IF;
END $$;

-- ============================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE builder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_call_logs ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view own messages" ON builder_messages
    FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Authenticated users can send messages" ON builder_messages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid());

CREATE POLICY "Recipients can mark messages as read" ON builder_messages
    FOR UPDATE USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON builder_conversations
    FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Authenticated users can create conversations" ON builder_conversations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (participant_1 = auth.uid() OR participant_2 = auth.uid()));

CREATE POLICY "Participants can update conversations" ON builder_conversations
    FOR UPDATE USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Inquiries policies
CREATE POLICY "Builders can view own inquiries" ON builder_inquiries
    FOR SELECT USING (builder_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Anyone can send inquiries" ON builder_inquiries
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Builders can update own inquiries" ON builder_inquiries
    FOR UPDATE USING (builder_id = auth.uid());

-- Call logs policies
CREATE POLICY "Builders can view own call logs" ON builder_call_logs
    FOR SELECT USING (builder_id = auth.uid() OR caller_id = auth.uid());

CREATE POLICY "Anyone can log calls" ON builder_call_logs
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- 4. PROFILE EDIT POLICIES (OWNER ONLY)
-- ============================================================

-- Drop existing profile policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Anyone can view profiles (public)
CREATE POLICY "Anyone can view profiles" ON profiles
    FOR SELECT USING (TRUE);

-- ONLY profile owner can update their own profile
CREATE POLICY "Only owner can update profile" ON profiles
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. POSTING RESTRICTIONS (BUILDERS ONLY)
-- ============================================================

-- Drop and recreate post policies to restrict to builders only
DROP POLICY IF EXISTS "Builders can manage own posts" ON builder_posts;
DROP POLICY IF EXISTS "Anyone can view public posts" ON builder_posts;

-- Only builders can create posts (professional_builder or private_client - no generic 'builder' role)
CREATE POLICY "Only builders can create posts" ON builder_posts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('professional_builder', 'private_client', 'admin')
        )
    );

-- Builders can update/delete own posts
CREATE POLICY "Builders can update own posts" ON builder_posts
    FOR UPDATE USING (builder_id = auth.uid());

CREATE POLICY "Builders can delete own posts" ON builder_posts
    FOR DELETE USING (builder_id = auth.uid());

-- Anyone can view public active posts
CREATE POLICY "Anyone can view public posts" ON builder_posts
    FOR SELECT USING (status = 'active' AND privacy = 'public');

-- Drop and recreate story policies
DROP POLICY IF EXISTS "Builders can manage own stories" ON builder_stories;
DROP POLICY IF EXISTS "Anyone can view active stories" ON builder_stories;

-- Only builders can create stories (professional_builder or private_client - no generic 'builder' role)
CREATE POLICY "Only builders can create stories" ON builder_stories
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('professional_builder', 'private_client', 'admin')
        )
    );

-- Builders can manage own stories
CREATE POLICY "Builders can update own stories" ON builder_stories
    FOR UPDATE USING (builder_id = auth.uid());

CREATE POLICY "Builders can delete own stories" ON builder_stories
    FOR DELETE USING (builder_id = auth.uid());

-- Anyone can view active stories
CREATE POLICY "Anyone can view active stories" ON builder_stories
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

-- ============================================================
-- 6. COMMENT POLICIES (ANYONE CAN COMMENT)
-- ============================================================

-- Drop and recreate comment policies
DROP POLICY IF EXISTS "Anyone can view active comments" ON post_comments;
DROP POLICY IF EXISTS "Users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can manage own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- Anyone can view active comments
CREATE POLICY "Anyone can view comments" ON post_comments
    FOR SELECT USING (status = 'active');

-- Any authenticated user can create comments
CREATE POLICY "Authenticated users can comment" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update own comments
CREATE POLICY "Users can update own comments" ON post_comments
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete own comments
CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 7. HELPER FUNCTIONS
-- ============================================================

-- Function to check if user is a builder (professional_builder or private_client - no generic 'builder' role)
CREATE OR REPLACE FUNCTION is_builder(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_user_id 
        AND role IN ('professional_builder', 'private_client', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user_1 UUID, p_user_2 UUID)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_participant_1 UUID;
    v_participant_2 UUID;
BEGIN
    -- Ensure consistent ordering
    IF p_user_1 < p_user_2 THEN
        v_participant_1 := p_user_1;
        v_participant_2 := p_user_2;
    ELSE
        v_participant_1 := p_user_2;
        v_participant_2 := p_user_1;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM builder_conversations
    WHERE participant_1 = v_participant_1 AND participant_2 = v_participant_2;
    
    -- Create if not exists
    IF v_conversation_id IS NULL THEN
        INSERT INTO builder_conversations (participant_1, participant_2)
        VALUES (v_participant_1, v_participant_2)
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message
CREATE OR REPLACE FUNCTION send_builder_message(
    p_recipient_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
    v_sender_id UUID;
    v_conversation_id UUID;
    v_message_id UUID;
BEGIN
    v_sender_id := auth.uid();
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get or create conversation
    v_conversation_id := get_or_create_conversation(v_sender_id, p_recipient_id);
    
    -- Insert message
    INSERT INTO builder_messages (sender_id, recipient_id, conversation_id, content, message_type)
    VALUES (v_sender_id, p_recipient_id, v_conversation_id, p_content, p_message_type)
    RETURNING id INTO v_message_id;
    
    -- Update conversation
    UPDATE builder_conversations
    SET 
        last_message_id = v_message_id,
        last_message_at = NOW(),
        participant_1_unread = CASE WHEN participant_1 = p_recipient_id THEN participant_1_unread + 1 ELSE participant_1_unread END,
        participant_2_unread = CASE WHEN participant_2 = p_recipient_id THEN participant_2_unread + 1 ELSE participant_2_unread END,
        updated_at = NOW()
    WHERE id = v_conversation_id;
    
    -- Create notification for recipient
    PERFORM create_notification(
        p_recipient_id,
        'message',
        'New Message',
        p_content,
        v_sender_id,
        'message',
        v_message_id,
        '/messages/' || v_conversation_id
    );
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Mark messages as read
    UPDATE builder_messages
    SET is_read = TRUE, read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND recipient_id = v_user_id
    AND is_read = FALSE;
    
    -- Reset unread count
    UPDATE builder_conversations
    SET 
        participant_1_unread = CASE WHEN participant_1 = v_user_id THEN 0 ELSE participant_1_unread END,
        participant_2_unread = CASE WHEN participant_2 = v_user_id THEN 0 ELSE participant_2_unread END
    WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON builder_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON builder_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON builder_inquiries TO authenticated;
GRANT SELECT, INSERT ON builder_call_logs TO authenticated;
GRANT SELECT, INSERT ON builder_inquiries TO anon;
GRANT INSERT ON builder_call_logs TO anon;

GRANT EXECUTE ON FUNCTION is_builder TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION send_builder_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
