-- ============================================================
-- Ensure delivered_at column exists in purchase_orders
-- Created: March 7, 2026
-- ============================================================
-- This migration ensures the delivered_at column exists
-- which is referenced by the update_order_status_from_items() trigger
-- ============================================================

DO $$ 
BEGIN
    -- Add delivered_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivered_at TIMESTAMPTZ;
        RAISE NOTICE 'Added delivered_at column to purchase_orders';
    ELSE
        RAISE NOTICE 'delivered_at column already exists in purchase_orders';
    END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
