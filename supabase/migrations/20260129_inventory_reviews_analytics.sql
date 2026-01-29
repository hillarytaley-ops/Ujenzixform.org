-- ============================================================
-- UjenziXform Database Migration
-- Inventory Management, Reviews, and Analytics Support
-- Created: January 29, 2026
-- ============================================================

-- ============================================================
-- 1. INVENTORY MANAGEMENT
-- ============================================================

-- Add inventory columns to supplier_product_prices if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'supplier_product_prices' AND column_name = 'stock_quantity') THEN
        ALTER TABLE supplier_product_prices ADD COLUMN stock_quantity INTEGER DEFAULT 100;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'supplier_product_prices' AND column_name = 'min_stock_level') THEN
        ALTER TABLE supplier_product_prices ADD COLUMN min_stock_level INTEGER DEFAULT 10;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'supplier_product_prices' AND column_name = 'max_stock_level') THEN
        ALTER TABLE supplier_product_prices ADD COLUMN max_stock_level INTEGER DEFAULT 1000;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'supplier_product_prices' AND column_name = 'last_restocked') THEN
        ALTER TABLE supplier_product_prices ADD COLUMN last_restocked TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Stock Movements Table (for inventory history)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    product_id UUID,
    product_name TEXT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier ON stock_movements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

-- RLS for stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Suppliers can view own stock movements"
    ON stock_movements FOR SELECT
    USING (supplier_id = auth.uid() OR supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Suppliers can insert own stock movements"
    ON stock_movements FOR INSERT
    WITH CHECK (supplier_id = auth.uid() OR supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- ============================================================
-- 2. REVIEWS & RATINGS SYSTEM
-- ============================================================

-- Supplier Reviews Table
CREATE TABLE IF NOT EXISTS supplier_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    reviewer_name TEXT NOT NULL,
    reviewer_avatar TEXT,
    supplier_id UUID NOT NULL,
    order_id UUID,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT NOT NULL,
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    helpful_count INTEGER DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    response TEXT,
    response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier ON supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_reviewer ON supplier_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_status ON supplier_reviews(status);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_rating ON supplier_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_created ON supplier_reviews(created_at DESC);

-- RLS for supplier_reviews
ALTER TABLE supplier_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY IF NOT EXISTS "Anyone can view approved reviews"
    ON supplier_reviews FOR SELECT
    USING (status = 'approved' OR reviewer_id = auth.uid());

-- Authenticated users can create reviews
CREATE POLICY IF NOT EXISTS "Authenticated users can create reviews"
    ON supplier_reviews FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND reviewer_id = auth.uid());

-- Users can update own reviews
CREATE POLICY IF NOT EXISTS "Users can update own reviews"
    ON supplier_reviews FOR UPDATE
    USING (reviewer_id = auth.uid());

-- Suppliers can respond to their reviews
CREATE POLICY IF NOT EXISTS "Suppliers can respond to reviews"
    ON supplier_reviews FOR UPDATE
    USING (supplier_id = auth.uid() OR supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_helpful_count(review_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE supplier_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. ANALYTICS SUPPORT
-- ============================================================

-- Analytics Events Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can view own events
CREATE POLICY IF NOT EXISTS "Users can view own analytics"
    ON analytics_events FOR SELECT
    USING (user_id = auth.uid());

-- Anyone can insert events (for tracking)
CREATE POLICY IF NOT EXISTS "Anyone can insert analytics events"
    ON analytics_events FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================
-- 4. UPDATE TRIGGERS
-- ============================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to supplier_reviews
DROP TRIGGER IF EXISTS update_supplier_reviews_updated_at ON supplier_reviews;
CREATE TRIGGER update_supplier_reviews_updated_at
    BEFORE UPDATE ON supplier_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT ON stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON supplier_reviews TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO authenticated;
GRANT EXECUTE ON FUNCTION increment_helpful_count TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

