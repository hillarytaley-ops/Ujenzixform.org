-- =====================================================
-- FIX: Function search_path security vulnerabilities
-- Sets immutable search_path for functions with mutable search_path
-- Also enhances security_events table for real-time alerts
-- =====================================================

-- 0. Enhance security_events table for real-time alert system
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';

ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;

ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id);

ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for faster real-time queries
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_acknowledged ON public.security_events(acknowledged);

-- Enable realtime for security_events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;

-- 1. Fix update_conversation_on_message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  UPDATE public.conversations
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
$func$;

COMMENT ON FUNCTION public.update_conversation_on_message() IS 'Trigger function to update conversation metadata. Has secure search_path.';

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- 2. Fix update_monitoring_requests_updated_at
CREATE OR REPLACE FUNCTION public.update_monitoring_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

COMMENT ON FUNCTION public.update_monitoring_requests_updated_at() IS 'Trigger function to update updated_at timestamp. Has secure search_path.';

DROP TRIGGER IF EXISTS trigger_monitoring_requests_updated_at ON public.monitoring_service_requests;
CREATE TRIGGER trigger_monitoring_requests_updated_at
  BEFORE UPDATE ON public.monitoring_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_monitoring_requests_updated_at();





















