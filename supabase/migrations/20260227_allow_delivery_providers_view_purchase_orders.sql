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
CREATE POLICY "purchase_orders_delivery_provider_view" ON purchase_orders
    FOR SELECT TO authenticated
    USING (
        -- Delivery providers can view orders that need delivery providers
        status IN (
            'delivery_requested',
            'awaiting_delivery_provider',
            'delivery_assigned',
            'ready_for_dispatch'
        )
        AND (
            -- Either no provider assigned yet (available for all providers)
            delivery_provider_id IS NULL
            OR
            -- Or assigned to this provider
            delivery_provider_id IN (
                SELECT id FROM delivery_providers WHERE user_id = auth.uid()
            )
            OR
            -- Or provider_id matches the user_id directly
            delivery_provider_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT ON purchase_orders TO authenticated;

-- Add comment
COMMENT ON POLICY "purchase_orders_delivery_provider_view" ON purchase_orders IS 
    'Allows delivery providers to view purchase_orders that need delivery services';
