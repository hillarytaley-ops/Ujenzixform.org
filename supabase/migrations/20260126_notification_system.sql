-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- Created: January 26, 2026
-- =====================================================

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email', 'push')),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id TEXT,
  success BOOLEAN DEFAULT false,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Create push_subscriptions table for web push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- Create index for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Channel preferences
  sms_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  
  -- Notification type preferences
  order_updates BOOLEAN DEFAULT true,
  delivery_alerts BOOLEAN DEFAULT true,
  quote_responses BOOLEAN DEFAULT true,
  promotions BOOLEAN DEFAULT false,
  system_alerts BOOLEAN DEFAULT true,
  
  -- Contact info
  phone_number TEXT,
  whatsapp_number TEXT,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences on user creation
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON profiles;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

