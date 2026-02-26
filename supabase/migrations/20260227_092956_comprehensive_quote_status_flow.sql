-- ============================================================
-- Comprehensive Quote Status Flow Migration
-- Created: February 27, 2026
-- 
-- This migration implements a comprehensive status flow for quotations:
-- 1. quote_created - Initial request by builder
-- 2. quote_received_by_supplier - Supplier sees it on dashboard
-- 3. quote_responded - Supplier replies with pricing
-- 4. quote_revised - Supplier makes modifications
-- 5. quote_viewed_by_builder - Builder reviews the response
-- 6. quote_accepted - Builder accepts (converts to order)
-- 7. quote_rejected - Builder rejects
-- ============================================================

-- ============================================================
-- 1. UPDATE STATUS CONSTRAINT TO INCLUDE NEW STATUSES
-- ============================================================

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop existing check constraint on status column
    ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
    
    -- Add new comprehensive status constraint
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
    CHECK (status IN (
        -- Quote flow statuses
        'quote_created',
        'quote_received_by_supplier',
        'quote_responded',
        'quote_revised',
        'quote_viewed_by_builder',
        'quote_accepted',
        'quote_rejected',
        -- Legacy statuses (for backward compatibility)
        'pending',
        'quoted',
        'confirmed',
        'approved',
        'rejected',
        'completed',
        'cancelled',
        'processing',
        -- Order statuses
        'dispatched',
        'partially_dispatched',
        'in_transit',
        'delivered',
        'received',
        'verified'
    ));
    
    RAISE NOTICE 'Updated purchase_orders status constraint with new quote flow statuses';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating status constraint: %', SQLERRM;
END $$;

-- ============================================================
-- 2. ADD STATUS TRACKING COLUMNS
-- ============================================================

-- Add timestamp columns for tracking status changes
DO $$
BEGIN
    -- Quote created timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_created_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_created_at TIMESTAMPTZ;
    END IF;
    
    -- Quote received by supplier timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_received_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_received_at TIMESTAMPTZ;
    END IF;
    
    -- Quote responded timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_responded_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_responded_at TIMESTAMPTZ;
    END IF;
    
    -- Quote revised timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_revised_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_revised_at TIMESTAMPTZ;
    END IF;
    
    -- Quote viewed by builder timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_viewed_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_viewed_at TIMESTAMPTZ;
    END IF;
    
    -- Quote accepted timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_accepted_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_accepted_at TIMESTAMPTZ;
    END IF;
    
    -- Quote rejected timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_rejected_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_rejected_at TIMESTAMPTZ;
    END IF;
    
    -- Track revision count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'quote_revision_count') THEN
        ALTER TABLE purchase_orders ADD COLUMN quote_revision_count INTEGER DEFAULT 0;
    END IF;
    
    RAISE NOTICE 'Added quote status tracking columns';
END $$;

-- ============================================================
-- 3. FUNCTION TO UPDATE STATUS WITH TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION update_quote_status(
    po_id UUID,
    new_status TEXT,
    update_timestamp BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
    UPDATE purchase_orders
    SET 
        status = new_status,
        updated_at = NOW(),
        -- Update relevant timestamp based on status
        quote_created_at = CASE 
            WHEN new_status = 'quote_created' AND update_timestamp THEN NOW()
            ELSE quote_created_at
        END,
        quote_received_at = CASE 
            WHEN new_status = 'quote_received_by_supplier' AND update_timestamp THEN NOW()
            ELSE quote_received_at
        END,
        quote_responded_at = CASE 
            WHEN new_status = 'quote_responded' AND update_timestamp THEN NOW()
            ELSE quote_responded_at
        END,
        quote_revised_at = CASE 
            WHEN new_status = 'quote_revised' AND update_timestamp THEN NOW()
            ELSE quote_revised_at
        END,
        quote_viewed_at = CASE 
            WHEN new_status = 'quote_viewed_by_builder' AND update_timestamp THEN NOW()
            ELSE quote_viewed_at
        END,
        quote_accepted_at = CASE 
            WHEN new_status = 'quote_accepted' AND update_timestamp THEN NOW()
            ELSE quote_accepted_at
        END,
        quote_rejected_at = CASE 
            WHEN new_status = 'quote_rejected' AND update_timestamp THEN NOW()
            ELSE quote_rejected_at
        END,
        quote_revision_count = CASE 
            WHEN new_status = 'quote_revised' THEN COALESCE(quote_revision_count, 0) + 1
            ELSE quote_revision_count
        END
    WHERE id = po_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_quote_status TO authenticated;

-- ============================================================
-- 4. FUNCTION TO AUTO-CONVERT QUOTE_ACCEPTED TO ORDER
-- ============================================================

CREATE OR REPLACE FUNCTION convert_quote_to_order()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to quote_accepted, automatically convert to order
    IF NEW.status = 'quote_accepted' AND (OLD.status IS NULL OR OLD.status != 'quote_accepted') THEN
        -- Update status to 'pending' (order awaiting delivery provider)
        -- This maintains backward compatibility with existing order flow
        NEW.status := 'pending';
        NEW.quote_accepted_at := NOW();
        
        -- Update total_amount to quote_amount if quote_amount exists
        IF NEW.quote_amount IS NOT NULL AND NEW.quote_amount > 0 THEN
            NEW.total_amount := NEW.quote_amount;
        END IF;
        
        -- Set delivery_required to true by default
        IF NEW.delivery_required IS NULL THEN
            NEW.delivery_required := TRUE;
        END IF;
        
        RAISE NOTICE 'Quote % converted to order (status: pending)', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-convert quote_accepted to order
DROP TRIGGER IF EXISTS trigger_convert_quote_to_order ON purchase_orders;
CREATE TRIGGER trigger_convert_quote_to_order
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION convert_quote_to_order();

-- ============================================================
-- 5. FUNCTION TO TRACK SUPPLIER VIEWING QUOTE
-- ============================================================

CREATE OR REPLACE FUNCTION mark_quote_received_by_supplier(po_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only update if status is quote_created or pending
    UPDATE purchase_orders
    SET 
        status = CASE 
            WHEN status = 'quote_created' OR status = 'pending' THEN 'quote_received_by_supplier'
            ELSE status
        END,
        quote_received_at = CASE 
            WHEN quote_received_at IS NULL AND (status = 'quote_created' OR status = 'pending') THEN NOW()
            ELSE quote_received_at
        END,
        updated_at = NOW()
    WHERE id = po_id 
    AND (status = 'quote_created' OR status = 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_quote_received_by_supplier TO authenticated;

-- ============================================================
-- 6. FUNCTION TO TRACK BUILDER VIEWING QUOTE RESPONSE
-- ============================================================

CREATE OR REPLACE FUNCTION mark_quote_viewed_by_builder(po_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only update if status is quote_responded or quote_revised
    UPDATE purchase_orders
    SET 
        status = CASE 
            WHEN status IN ('quote_responded', 'quote_revised') THEN 'quote_viewed_by_builder'
            ELSE status
        END,
        quote_viewed_at = CASE 
            WHEN quote_viewed_at IS NULL AND status IN ('quote_responded', 'quote_revised') THEN NOW()
            ELSE quote_viewed_at
        END,
        updated_at = NOW()
    WHERE id = po_id 
    AND status IN ('quote_responded', 'quote_revised');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_quote_viewed_by_builder TO authenticated;

-- ============================================================
-- 7. UPDATE EXISTING RECORDS
-- ============================================================

-- Set quote_created_at for existing pending/quoted orders
UPDATE purchase_orders
SET 
    quote_created_at = created_at,
    status = CASE 
        WHEN status = 'pending' AND supplier_id IS NULL THEN 'quote_created'
        WHEN status = 'quoted' THEN 'quote_responded'
        ELSE status
    END
WHERE status IN ('pending', 'quoted')
AND quote_created_at IS NULL;

-- ============================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_status ON purchase_orders(status) 
WHERE status IN ('quote_created', 'quote_received_by_supplier', 'quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quote_accepted', 'quote_rejected');

CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_created_at ON purchase_orders(quote_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_responded_at ON purchase_orders(quote_responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_accepted_at ON purchase_orders(quote_accepted_at DESC);

-- ============================================================
-- Migration Complete
-- ============================================================
