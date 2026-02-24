-- ============================================================
-- Add Delivery Provider Assignment to Purchase Orders
-- Created: February 24, 2026
-- ============================================================

-- Add delivery provider columns to purchase_orders
DO $$ 
BEGIN
    -- Delivery provider ID (references delivery_providers table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_id') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_id UUID;
    END IF;
    
    -- Delivery provider name (denormalized for quick display)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_name') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_name TEXT;
    END IF;
    
    -- Delivery provider phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_phone') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_phone TEXT;
    END IF;
    
    -- Delivery provider vehicle info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_vehicle_info') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_vehicle_info TEXT;
    END IF;
    
    -- Delivery assignment status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_status') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_status TEXT DEFAULT 'pending' 
            CHECK (delivery_status IN ('pending', 'requested', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'));
    END IF;
    
    -- When delivery was assigned
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_assigned_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_assigned_at TIMESTAMPTZ;
    END IF;
    
    -- When delivery provider accepted
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_accepted_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_accepted_at TIMESTAMPTZ;
    END IF;
    
    -- Estimated delivery time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'estimated_delivery_time') THEN
        ALTER TABLE purchase_orders ADD COLUMN estimated_delivery_time TIMESTAMPTZ;
    END IF;
    
    -- Delivery notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_notes') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_notes TEXT;
    END IF;
END $$;

-- Create index for delivery provider lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_provider ON purchase_orders(delivery_provider_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_status ON purchase_orders(delivery_status);

-- ============================================================
-- Function to assign delivery provider to an order
-- ============================================================
CREATE OR REPLACE FUNCTION assign_delivery_provider(
    _order_id UUID,
    _provider_id UUID,
    _provider_name TEXT,
    _provider_phone TEXT,
    _vehicle_info TEXT DEFAULT NULL,
    _estimated_delivery TIMESTAMPTZ DEFAULT NULL,
    _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    UPDATE purchase_orders
    SET 
        delivery_provider_id = _provider_id,
        delivery_provider_name = _provider_name,
        delivery_provider_phone = _provider_phone,
        delivery_vehicle_info = _vehicle_info,
        delivery_status = 'assigned',
        delivery_assigned_at = NOW(),
        estimated_delivery_time = _estimated_delivery,
        delivery_notes = _notes,
        updated_at = NOW()
    WHERE id = _order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Delivery provider assigned successfully',
        'order_id', _order_id,
        'provider_name', _provider_name
    );
END;
$$;

-- ============================================================
-- Function for delivery provider to accept an order
-- ============================================================
CREATE OR REPLACE FUNCTION accept_delivery_assignment(
    _order_id UUID,
    _provider_id UUID,
    _estimated_delivery TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE purchase_orders
    SET 
        delivery_status = 'accepted',
        delivery_accepted_at = NOW(),
        estimated_delivery_time = COALESCE(_estimated_delivery, estimated_delivery_time),
        updated_at = NOW()
    WHERE id = _order_id 
      AND delivery_provider_id = _provider_id
      AND delivery_status = 'assigned';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or not assigned to this provider');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Delivery assignment accepted',
        'order_id', _order_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_delivery_provider TO authenticated;
GRANT EXECUTE ON FUNCTION accept_delivery_assignment TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
