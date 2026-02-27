-- ============================================================
-- Allow Delivery Providers to View Purchase Orders Needing Delivery
-- Created: February 27, 2026
-- ============================================================

-- First, ensure delivery_provider_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_id') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_id UUID;
        RAISE NOTICE 'Added delivery_provider_id column to purchase_orders';
    END IF;
END $$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "purchase_orders_delivery_provider_view" ON purchase_orders;

-- Create policy for delivery providers to view purchase_orders that need delivery
-- They can see orders with delivery-related statuses (awaiting delivery providers)
-- First, create a simple policy that doesn't check delivery_provider_id
CREATE POLICY "purchase_orders_delivery_provider_view" ON purchase_orders
    FOR SELECT TO authenticated
    USING (
        -- Check if user is a delivery provider
        EXISTS (
            SELECT 1 FROM delivery_providers 
            WHERE user_id = auth.uid()
        )
        AND
        -- Delivery providers can view orders that need delivery providers
        -- Include quote_accepted and awaiting_delivery_request so providers can see orders immediately after quote acceptance
        status IN (
            'quote_accepted',
            'order_created',
            'awaiting_delivery_request',
            'delivery_requested',
            'awaiting_delivery_provider',
            'delivery_assigned',
            'ready_for_dispatch'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON purchase_orders TO authenticated;

-- Add comment
COMMENT ON POLICY "purchase_orders_delivery_provider_view" ON purchase_orders IS 
    'Allows delivery providers to view purchase_orders that need delivery services';
