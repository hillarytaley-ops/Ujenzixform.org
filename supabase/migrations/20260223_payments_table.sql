-- ============================================================
-- UjenziPro/MradiPro Database Migration
-- Payments Table for Paystack Integration
-- Created: February 23, 2026
-- ============================================================

-- ============================================================
-- 1. PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Order Info
    user_id UUID NOT NULL REFERENCES auth.users(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    -- Payment Details
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    
    -- Paystack Reference
    paystack_reference TEXT UNIQUE NOT NULL,
    paystack_access_code TEXT,
    paystack_transaction_id TEXT,
    
    -- Status: pending, success, failed, abandoned, refunded
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'refunded')),
    
    -- Payment Method Info
    payment_method TEXT, -- card, mobile_money, bank_transfer, etc.
    card_type TEXT, -- visa, mastercard, etc.
    card_last4 TEXT, -- last 4 digits
    bank_name TEXT,
    
    -- Mobile Money (M-Pesa, etc.)
    mobile_money_number TEXT,
    mobile_money_provider TEXT,
    
    -- Customer Info (from Paystack)
    customer_email TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    
    -- Response Data
    gateway_response TEXT,
    channel TEXT,
    ip_address TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own payments
CREATE POLICY "Users can insert own payments"
    ON payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- System can update payments (for webhook updates)
CREATE POLICY "System can update payments"
    ON payments FOR UPDATE
    USING (TRUE);

-- Admin can view all payments
CREATE POLICY "Admin can view all payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================
-- 4. PAYMENT HISTORY VIEW
-- ============================================================

CREATE OR REPLACE VIEW payment_history AS
SELECT 
    p.id,
    p.user_id,
    p.purchase_order_id,
    p.amount,
    p.currency,
    p.paystack_reference,
    p.status,
    p.payment_method,
    p.card_type,
    p.card_last4,
    p.mobile_money_provider,
    p.customer_email,
    p.gateway_response,
    p.paid_at,
    p.created_at,
    po.po_number,
    po.total_amount as order_total,
    po.delivery_address
FROM payments p
LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id;

-- ============================================================
-- 5. UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

-- ============================================================
-- 6. FUNCTION TO VERIFY PAYMENT
-- ============================================================

CREATE OR REPLACE FUNCTION verify_payment(
    p_reference TEXT,
    p_status TEXT,
    p_transaction_id TEXT,
    p_gateway_response TEXT,
    p_channel TEXT,
    p_card_type TEXT DEFAULT NULL,
    p_card_last4 TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment_id UUID;
    v_order_id UUID;
BEGIN
    -- Update payment record
    UPDATE payments 
    SET 
        status = p_status,
        paystack_transaction_id = p_transaction_id,
        gateway_response = p_gateway_response,
        channel = p_channel,
        card_type = p_card_type,
        card_last4 = p_card_last4,
        bank_name = p_bank_name,
        paid_at = CASE WHEN p_status = 'success' THEN NOW() ELSE NULL END
    WHERE paystack_reference = p_reference
    RETURNING id, purchase_order_id INTO v_payment_id, v_order_id;
    
    -- If payment successful, update order status
    IF p_status = 'success' AND v_order_id IS NOT NULL THEN
        UPDATE purchase_orders 
        SET status = 'paid'
        WHERE id = v_order_id;
    END IF;
    
    RETURN v_payment_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;
GRANT SELECT ON payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION verify_payment TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
