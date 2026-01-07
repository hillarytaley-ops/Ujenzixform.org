-- ============================================================================
-- GENERAL NOTIFICATIONS TABLE
-- Created: December 28, 2025
-- Purpose: App-wide notification system for all user types
-- ============================================================================

-- Create notification types enum
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'order_update',
        'delivery_update', 
        'payment_received',
        'payment_pending',
        'quote_received',
        'quote_accepted',
        'quote_rejected',
        'product_approved',
        'product_rejected',
        'new_message',
        'system_alert',
        'promotion',
        'reminder',
        'verification_required',
        'account_update',
        'review_received',
        'price_alert',
        'stock_alert',
        'delivery_assigned',
        'delivery_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'system_alert',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    action_label TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority) WHERE priority IN ('high', 'urgent');

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- Only system/admin can insert notifications (via functions)
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (TRUE);

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL,
    p_action_label TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal',
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, data, 
        action_url, action_label, priority, expires_at
    )
    VALUES (
        p_user_id, p_type, p_title, p_message, p_data,
        p_action_url, p_action_label, p_priority, p_expires_at
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = auth.uid() AND read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.notifications
    WHERE user_id = auth.uid() 
      AND read = FALSE
      AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN v_count;
END;
$$;

-- Function to get recent notifications
CREATE OR REPLACE FUNCTION public.get_recent_notifications(
    p_limit INTEGER DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    read BOOLEAN,
    action_url TEXT,
    action_label TEXT,
    priority TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id, n.type, n.title, n.message, n.data, n.read,
        n.action_url, n.action_label, n.priority, n.created_at
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
      AND (NOT p_unread_only OR n.read = FALSE)
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to delete old notifications (cleanup job)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL
      AND read = TRUE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Trigger function to send notification on order status change
CREATE OR REPLACE FUNCTION public.notify_on_delivery_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_builder_id UUID;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Get the builder who placed the order
    SELECT user_id INTO v_builder_id
    FROM public.delivery_requests
    WHERE id = NEW.delivery_id;

    IF v_builder_id IS NOT NULL THEN
        v_title := 'Delivery Update';
        v_message := 'Your delivery status has been updated to: ' || NEW.status;

        PERFORM public.create_notification(
            v_builder_id,
            'delivery_update',
            v_title,
            v_message,
            jsonb_build_object('delivery_id', NEW.delivery_id, 'status', NEW.status),
            '/tracking',
            'Track Delivery',
            'normal'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_notifications TO authenticated;

-- Add comments
COMMENT ON TABLE public.notifications IS 'App-wide notification system for all users';
COMMENT ON FUNCTION public.create_notification IS 'Create a new notification for a user';
COMMENT ON FUNCTION public.mark_notification_read IS 'Mark a single notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Mark all notifications as read for current user';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Get count of unread notifications';
COMMENT ON FUNCTION public.get_recent_notifications IS 'Get recent notifications with optional unread filter';


