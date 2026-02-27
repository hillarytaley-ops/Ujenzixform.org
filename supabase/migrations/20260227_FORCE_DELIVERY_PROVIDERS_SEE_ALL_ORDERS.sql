-- ============================================================
-- FORCE FIX: Allow delivery providers to see ALL orders needing delivery
-- This is a more permissive policy to ensure orders are visible
-- Created: February 27, 2026
-- ============================================================

-- Drop the existing policy to recreate it with more statuses
DROP POLICY IF EXISTS "purchase_orders_delivery_provider_view" ON purchase_orders;

-- Create a VERY PERMISSIVE policy for delivery providers
-- They can see ANY order that has a delivery-related status
-- This policy uses OR logic with other policies (PERMISSIVE)
CREATE POLICY "purchase_orders_delivery_provider_view" ON purchase_orders
    FOR SELECT TO authenticated
    USING (
        -- User must be a delivery provider (check multiple ways)
        (
            EXISTS (
                SELECT 1 FROM delivery_providers 
                WHERE user_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM delivery_providers 
                WHERE id::text = auth.uid()::text
            )
            OR
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN delivery_providers dp ON dp.user_id = p.user_id
                WHERE p.user_id = auth.uid()
            )
        )
        AND
        -- Show orders with ANY delivery-related status
        -- This includes all statuses from quote acceptance through delivery
        status IN (
            -- Quote phase (after acceptance)
            'quote_accepted',
            -- Order phase
            'order_created',
            'awaiting_delivery_request',
            'delivery_requested',
            'awaiting_delivery_provider',
            'delivery_assigned',
            'ready_for_dispatch',
            -- In transit
            'dispatched',
            'in_transit',
            'delivery_arrived',
            -- Legacy statuses that might still exist
            'pending',
            'quoted',
            'confirmed',
            'accepted',
            'processing',
            'partially_dispatched',
            'delivered',
            'verified'
        )
    );

-- Grant SELECT permission
GRANT SELECT ON purchase_orders TO authenticated;

-- Add comment
COMMENT ON POLICY "purchase_orders_delivery_provider_view" ON purchase_orders IS 
    'Allows delivery providers to view ALL purchase_orders that need delivery services, including quote_accepted and awaiting_delivery_request';
