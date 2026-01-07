-- ============================================================
-- MradiPro Order Management System
-- Created: December 27, 2025
-- 
-- This migration creates tables for:
-- - Complete order management
-- - Quote requests and responses
-- - Notifications system
-- - Delivery tracking
-- - Payment processing
-- ============================================================

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    builder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    builder_name VARCHAR(255),
    builder_email VARCHAR(255),
    builder_phone VARCHAR(50),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('quote_request', 'direct_purchase')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    subtotal DECIMAL(12, 2) DEFAULT 0,
    delivery_fee DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    delivery_address TEXT,
    delivery_notes TEXT,
    delivery_provider_id UUID,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_reference VARCHAR(255),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'unit',
    unit_price DECIMAL(12, 2) DEFAULT 0,
    total_price DECIMAL(12, 2) DEFAULT 0,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- QUOTE RESPONSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    quoted_items JSONB,
    total_quoted DECIMAL(12, 2),
    valid_until TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    order_updates BOOLEAN DEFAULT TRUE,
    quote_updates BOOLEAN DEFAULT TRUE,
    delivery_updates BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================
-- NOTIFICATION LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    channels TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DELIVERY ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    provider_id UUID,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DELIVERY TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50),
    location JSONB,
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DELIVERY REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    provider_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    method VARCHAR(50),
    reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_builder_id ON orders(builder_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier_id ON order_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_quote_responses_order_id ON quote_responses(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update updated_at on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM order_items
        WHERE order_id = NEW.order_id
    ),
    total_amount = (
        SELECT COALESCE(SUM(total_price), 0) + COALESCE(orders.delivery_fee, 0)
        FROM order_items
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_order_totals ON order_items;
CREATE TRIGGER trigger_calculate_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (builder_id = auth.uid() OR EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.supplier_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (builder_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their orders" ON orders;
CREATE POLICY "Users can update their orders" ON orders
    FOR UPDATE USING (builder_id = auth.uid() OR EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.supplier_id = auth.uid()
    ));

-- Order items policies
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
CREATE POLICY "Users can view order items" ON order_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND (o.builder_id = auth.uid() OR order_items.supplier_id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users can insert order items" ON order_items;
CREATE POLICY "Users can insert order items" ON order_items
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.builder_id = auth.uid()
    ));

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can manage their preferences" ON notification_preferences;
CREATE POLICY "Users can manage their preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Push subscriptions policies
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their subscriptions" ON push_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Quote responses policies
DROP POLICY IF EXISTS "Users can view quote responses" ON quote_responses;
CREATE POLICY "Users can view quote responses" ON quote_responses
    FOR SELECT USING (supplier_id = auth.uid() OR EXISTS (
        SELECT 1 FROM orders o WHERE o.id = quote_responses.order_id AND o.builder_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Suppliers can create quote responses" ON quote_responses;
CREATE POLICY "Suppliers can create quote responses" ON quote_responses
    FOR INSERT WITH CHECK (supplier_id = auth.uid());

-- ============================================================
-- GRANTS
-- ============================================================
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_status_history TO authenticated;
GRANT ALL ON quote_responses TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON delivery_assignments TO authenticated;
GRANT ALL ON delivery_tracking TO authenticated;
GRANT ALL ON payments TO authenticated;

GRANT SELECT ON orders TO anon;
GRANT SELECT ON order_items TO anon;








