-- Chat System Tables for Staff-Client Communication
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_avatar TEXT,
  client_role TEXT CHECK (client_role IN ('builder', 'supplier', 'delivery', 'guest')),
  assigned_staff_id UUID,
  assigned_staff_name TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('staff', 'client', 'system')),
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. QUICK REPLIES TABLE (for staff)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_staff ON conversations(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, sender_type);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- Conversations: Staff can see all, clients can see their own
CREATE POLICY "Staff can view all conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own conversations" ON conversations
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Anyone can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Chat Messages: Participants can see messages in their conversations
CREATE POLICY "View messages in own conversations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (
        c.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Insert messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (
        c.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      )
    )
  );

-- Quick Replies: Only staff can manage
CREATE POLICY "Staff can manage quick replies" ON chat_quick_replies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 6. FUNCTIONS FOR REAL-TIME UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    unread_count = CASE 
      WHEN NEW.sender_type = 'client' THEN unread_count + 1
      ELSE unread_count
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when new message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- 7. INSERT DEFAULT QUICK REPLIES
-- =====================================================
INSERT INTO chat_quick_replies (title, content, category) VALUES
  ('Greeting', 'Hello! Thank you for contacting UjenziPro support. How can I assist you today?', 'general'),
  ('Order Status', 'I''d be happy to help you check your order status. Could you please provide your order number?', 'orders'),
  ('Delivery Info', 'For delivery inquiries, please share your tracking number and I''ll look into it right away.', 'delivery'),
  ('Account Help', 'I can help you with your account. What specific issue are you experiencing?', 'account'),
  ('Thank You', 'Thank you for contacting us! Is there anything else I can help you with?', 'general'),
  ('Closing', 'Thank you for choosing UjenziPro. Have a great day! Feel free to reach out if you need any further assistance.', 'general'),
  ('Payment Issue', 'I understand you''re having a payment issue. Let me look into this for you. Can you provide your transaction reference number?', 'payment'),
  ('Registration Help', 'I can help you with the registration process. Which type of account are you trying to create - Builder, Supplier, or Delivery Provider?', 'account')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. ENABLE REALTIME FOR CHAT TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Success message
SELECT 'Chat tables created successfully!' as status;




