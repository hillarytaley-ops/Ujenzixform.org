-- ============================================================
-- Order Status Tracking Based on Material Items & Delivery
-- Created: February 19, 2026
-- 
-- Order Status Flow:
-- 1. confirmed     → Builder accepted quote, QR codes generated
-- 2. dispatched    → Supplier scanned QR codes (loading to vehicle)
-- 3. in_transit    → Delivery provider accepted & is on the move
-- 4. delivered     → Receiver scanned QR codes at destination
-- ============================================================

-- ============================================================
-- 1. Add order_status column to purchase_orders if not exists
-- ============================================================
DO $$ 
BEGIN
    -- Add order_status column for more granular tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'order_status') THEN
        ALTER TABLE purchase_orders ADD COLUMN order_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add dispatch tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'dispatched_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN dispatched_at TIMESTAMPTZ;
    END IF;
    
    -- Add in_transit tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'in_transit_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN in_transit_at TIMESTAMPTZ;
    END IF;
    
    -- Add delivered tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Add delivery provider reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_id') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_id UUID;
    END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_status ON purchase_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_provider ON purchase_orders(delivery_provider_id);

-- ============================================================
-- 2. Function to update order status based on material items
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_order_status_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    total_items INTEGER;
    dispatched_items INTEGER;
    received_items INTEGER;
    new_order_status TEXT;
BEGIN
    -- Get the purchase_order_id from the material item
    po_id := NEW.purchase_order_id;
    
    IF po_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count items in different states
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE dispatch_scanned = TRUE),
        COUNT(*) FILTER (WHERE receive_scanned = TRUE)
    INTO total_items, dispatched_items, received_items
    FROM material_items
    WHERE purchase_order_id = po_id;
    
    -- Determine new order status based on item states
    IF received_items = total_items AND total_items > 0 THEN
        -- All items received
        new_order_status := 'delivered';
        
        UPDATE purchase_orders
        SET order_status = 'delivered',
            status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;
        
    ELSIF received_items > 0 THEN
        -- Some items received (partial delivery)
        new_order_status := 'partially_delivered';
        
        UPDATE purchase_orders
        SET order_status = 'partially_delivered',
            updated_at = NOW()
        WHERE id = po_id;
        
    ELSIF dispatched_items = total_items AND total_items > 0 THEN
        -- All items dispatched
        new_order_status := 'dispatched';
        
        UPDATE purchase_orders
        SET order_status = 'dispatched',
            status = 'dispatched',
            dispatched_at = COALESCE(dispatched_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;
        
    ELSIF dispatched_items > 0 THEN
        -- Some items dispatched
        new_order_status := 'partially_dispatched';
        
        UPDATE purchase_orders
        SET order_status = 'partially_dispatched',
            updated_at = NOW()
        WHERE id = po_id;
    END IF;
    
    -- Log the status change
    INSERT INTO order_status_history (order_id, status, notes, created_at)
    VALUES (po_id, new_order_status, 'Auto-updated from QR scan', NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger on material_items
DROP TRIGGER IF EXISTS trigger_update_order_status ON material_items;
CREATE TRIGGER trigger_update_order_status
    AFTER UPDATE OF dispatch_scanned, receive_scanned, status ON material_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status_from_items();

-- ============================================================
-- 3. Function to update order status when delivery provider accepts
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_order_in_transit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
BEGIN
    -- When delivery request is accepted, update the linked purchase order
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        po_id := NEW.purchase_order_id;
        
        IF po_id IS NOT NULL THEN
            UPDATE purchase_orders
            SET order_status = 'in_transit',
                status = CASE WHEN status = 'dispatched' THEN 'in_transit' ELSE status END,
                in_transit_at = NOW(),
                delivery_provider_id = NEW.provider_id,
                updated_at = NOW()
            WHERE id = po_id;
            
            -- Log the status change
            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, 'in_transit', 'Delivery provider accepted - tracking started', NOW())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on delivery_requests
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_order_in_transit();

-- ============================================================
-- 4. Create order_status_history table if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON order_status_history(created_at DESC);

-- RLS for order_status_history
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view order status history"
    ON order_status_history FOR SELECT
    USING (TRUE);

CREATE POLICY IF NOT EXISTS "System can insert status history"
    ON order_status_history FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================
-- 5. Update existing confirmed orders to have proper order_status
-- ============================================================
UPDATE purchase_orders
SET order_status = CASE
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'in_transit' THEN 'in_transit'
    WHEN status = 'dispatched' THEN 'dispatched'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'quoted' THEN 'quoted'
    ELSE 'pending'
END
WHERE order_status IS NULL OR order_status = 'pending';

-- ============================================================
-- 6. Grant permissions
-- ============================================================
GRANT SELECT ON order_status_history TO authenticated;
GRANT INSERT ON order_status_history TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
