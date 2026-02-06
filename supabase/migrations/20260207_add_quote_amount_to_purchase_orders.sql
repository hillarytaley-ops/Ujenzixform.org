-- =====================================================================
-- ADD quote_amount AND RELATED COLUMNS TO purchase_orders TABLE
-- =====================================================================
-- These columns support the supplier quote response workflow:
-- - quote_amount: The supplier's quoted price (may differ from original total_amount)
-- - supplier_notes: Supplier's message/notes with the quote
-- - quote_valid_until: Quote expiration date
-- - project_name: Name/description of the project
-- =====================================================================

-- Add quote_amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'quote_amount'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_amount NUMERIC;
        RAISE NOTICE 'Added quote_amount column to purchase_orders';
    ELSE
        RAISE NOTICE 'quote_amount column already exists';
    END IF;
END $$;

-- Add supplier_notes column for supplier's message with the quote
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'supplier_notes'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN supplier_notes TEXT;
        RAISE NOTICE 'Added supplier_notes column to purchase_orders';
    ELSE
        RAISE NOTICE 'supplier_notes column already exists';
    END IF;
END $$;

-- Add quote_valid_until column for quote expiration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'quote_valid_until'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_valid_until TIMESTAMPTZ;
        RAISE NOTICE 'Added quote_valid_until column to purchase_orders';
    ELSE
        RAISE NOTICE 'quote_valid_until column already exists';
    END IF;
END $$;

-- Add project_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'project_name'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN project_name TEXT;
        RAISE NOTICE 'Added project_name column to purchase_orders';
    ELSE
        RAISE NOTICE 'project_name column already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('quote_amount', 'supplier_notes', 'quote_valid_until', 'project_name');
