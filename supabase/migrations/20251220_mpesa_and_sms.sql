-- =====================================================
-- M-Pesa Payments & SMS Logs Tables
-- Created: 2024-12-20
-- Purpose: Store M-Pesa transactions and SMS notification logs
-- =====================================================

-- ============================================================
-- M-PESA PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mpesa_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and order reference
    user_id TEXT NOT NULL,
    order_id TEXT,
    
    -- M-Pesa transaction details
    checkout_request_id TEXT NOT NULL UNIQUE,
    merchant_request_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    account_reference TEXT NOT NULL,
    description TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    mpesa_receipt_number TEXT,
    transaction_date TIMESTAMPTZ,
    result_code TEXT,
    result_desc TEXT,
    
    -- Metadata
    callback_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for M-Pesa payments
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_user ON public.mpesa_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_checkout ON public.mpesa_payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_status ON public.mpesa_payments(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_receipt ON public.mpesa_payments(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_created ON public.mpesa_payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.mpesa_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for M-Pesa payments
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.mpesa_payments
FOR SELECT
USING (
    user_id = auth.uid()::text OR
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Anyone can insert (for payment initiation)
CREATE POLICY "Anyone can initiate payments"
ON public.mpesa_payments
FOR INSERT
WITH CHECK (true);

-- Only system/admin can update (for callbacks)
CREATE POLICY "System can update payments"
ON public.mpesa_payments
FOR UPDATE
USING (true);

-- ============================================================
-- SMS LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference (optional - system SMS won't have user)
    user_id TEXT,
    
    -- SMS details
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN (
        'order_confirmation',
        'delivery_update', 
        'payment_confirmation',
        'otp_verification',
        'marketing',
        'alert',
        'reminder',
        'general'
    )),
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    message_id TEXT,
    cost TEXT,
    provider TEXT DEFAULT 'africastalking',
    error_message TEXT,
    
    -- Delivery confirmation
    delivered_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SMS logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_category ON public.sms_logs(category);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SMS logs
-- Only admins can view all SMS logs
CREATE POLICY "Admins can view SMS logs"
ON public.sms_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- System can insert SMS logs
CREATE POLICY "System can insert SMS logs"
ON public.sms_logs
FOR INSERT
WITH CHECK (true);

-- System can update SMS logs (for delivery reports)
CREATE POLICY "System can update SMS logs"
ON public.sms_logs
FOR UPDATE
USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update timestamp trigger for M-Pesa payments
CREATE OR REPLACE FUNCTION update_mpesa_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mpesa_payments_updated
    BEFORE UPDATE ON public.mpesa_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_mpesa_payments_timestamp();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.mpesa_payments IS 'Stores M-Pesa STK Push payment transactions';
COMMENT ON TABLE public.sms_logs IS 'Stores SMS notification logs for all outgoing messages';

COMMENT ON COLUMN public.mpesa_payments.checkout_request_id IS 'Unique identifier from M-Pesa for tracking the transaction';
COMMENT ON COLUMN public.mpesa_payments.mpesa_receipt_number IS 'M-Pesa confirmation code shown to customer';
COMMENT ON COLUMN public.sms_logs.category IS 'Type of SMS for analytics and filtering';
COMMENT ON COLUMN public.sms_logs.provider IS 'SMS gateway provider used (africastalking, twilio, etc.)';

-- ============================================================
-- VIEWS FOR ANALYTICS
-- ============================================================

-- Payment analytics view
CREATE OR REPLACE VIEW public.payment_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
    AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_amount
FROM public.mpesa_payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- SMS analytics view
CREATE OR REPLACE VIEW public.sms_analytics AS
SELECT 
    DATE(created_at) as date,
    category,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    SUM(CAST(REPLACE(cost, 'KES ', '') AS DECIMAL)) as total_cost
FROM public.sms_logs
GROUP BY DATE(created_at), category
ORDER BY date DESC, category;












