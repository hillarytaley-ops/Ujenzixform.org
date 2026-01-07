-- Add tracking_number column to delivery_requests table
-- This tracking number is generated when a delivery provider ACCEPTS the request
-- The tracking number persists even if provider cancels - it transfers to the next provider

-- Add tracking_number column
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS tracking_number TEXT UNIQUE;

-- Add accepted_at timestamp
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add rejection_reason column
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add rejected_at timestamp
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Create index for faster tracking number lookups
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tracking_number 
ON public.delivery_requests(tracking_number);

-- Create index for builder lookups
CREATE INDEX IF NOT EXISTS idx_delivery_requests_builder_id_status 
ON public.delivery_requests(builder_id, status);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id, read, created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- System can insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Enable realtime for delivery_requests (tracking updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMENT ON COLUMN public.delivery_requests.tracking_number IS 
'Unique tracking number generated when delivery provider accepts. Format: TRK-YYYYMMDD-XXXXX. Persists even if provider cancels.';





















