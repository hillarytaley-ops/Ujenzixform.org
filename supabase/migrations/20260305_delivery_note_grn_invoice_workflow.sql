-- ============================================================
-- Delivery Note, GRN, and Invoice Workflow
-- Created: March 5, 2026
-- 
-- Complete workflow:
-- 1. Delivery completed → Auto-create Delivery Note (DN)
-- 2. Builder signs DN electronically
-- 3. DN forwarded to supplier
-- 4. Builder confirms inspection/verification
-- 5. Builder accepts/rejects materials
-- 6. If accepted → Generate Goods Received Note (GRN)
-- 7. GRN available on supplier and admin dashboards
-- 8. After GRN received → Create invoice (editable by supplier)
-- 9. Invoice sent to builder and admin
-- 10. Builder acknowledges and processes payment
-- ============================================================

-- ============================================================
-- 1. DELIVERY NOTES (DN) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    delivery_request_id UUID REFERENCES delivery_requests(id) ON DELETE SET NULL,
    dn_number TEXT UNIQUE NOT NULL, -- e.g., DN-2026-001
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    delivery_provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Delivery details
    delivery_address TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TIMESTAMPTZ,
    items JSONB NOT NULL, -- Array of delivered items with quantities
    
    -- Signature tracking
    builder_signature TEXT, -- Base64 encoded signature image
    builder_signed_at TIMESTAMPTZ,
    builder_signed_by UUID REFERENCES auth.users(id),
    
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending_signature' 
        CHECK (status IN ('pending_signature', 'signed', 'forwarded_to_supplier', 'inspection_pending', 'inspection_completed', 'accepted', 'rejected', 'cancelled')),
    
    -- Inspection details
    inspection_verified BOOLEAN DEFAULT FALSE,
    inspection_verified_at TIMESTAMPTZ,
    inspection_notes TEXT,
    
    -- Acceptance/Rejection
    builder_decision TEXT CHECK (builder_decision IN ('accepted', 'rejected', NULL)),
    builder_decision_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for delivery_notes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_po ON delivery_notes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_builder ON delivery_notes(builder_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_supplier ON delivery_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_dn_number ON delivery_notes(dn_number);

-- ============================================================
-- 2. GOODS RECEIVED NOTES (GRN) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    grn_number TEXT UNIQUE NOT NULL, -- e.g., GRN-2026-001
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Goods details
    items JSONB NOT NULL, -- Array of received items with quantities
    total_quantity INTEGER,
    condition_notes TEXT,
    received_date DATE NOT NULL,
    received_time TIMESTAMPTZ,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'generated'
        CHECK (status IN ('generated', 'viewed_by_supplier', 'viewed_by_admin', 'acknowledged')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for goods_received_notes
CREATE INDEX IF NOT EXISTS idx_grn_delivery_note ON goods_received_notes(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_received_notes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_builder ON goods_received_notes(builder_id);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_received_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_number ON goods_received_notes(grn_number);

-- ============================================================
-- 3. INVOICES TABLE (Enhanced)
-- ============================================================
-- Check if invoices table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE TABLE invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_number TEXT UNIQUE NOT NULL,
            purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
            grn_id UUID REFERENCES goods_received_notes(id) ON DELETE SET NULL,
            supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
            builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            
            -- Invoice details
            items JSONB NOT NULL,
            subtotal DECIMAL(12, 2) NOT NULL,
            tax_amount DECIMAL(12, 2) DEFAULT 0,
            discount_amount DECIMAL(12, 2) DEFAULT 0,
            total_amount DECIMAL(12, 2) NOT NULL,
            currency TEXT DEFAULT 'KES',
            
            -- Dates
            invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
            due_date DATE,
            
            -- Status
            status TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'sent', 'viewed_by_builder', 'viewed_by_admin', 'acknowledged', 'paid', 'overdue', 'cancelled')),
            
            -- Payment tracking
            payment_status TEXT DEFAULT 'pending'
                CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
            amount_paid DECIMAL(12, 2) DEFAULT 0,
            payment_method TEXT,
            payment_reference TEXT,
            paid_at TIMESTAMPTZ,
            
            -- Supplier editing
            is_editable BOOLEAN DEFAULT TRUE,
            last_edited_at TIMESTAMPTZ,
            last_edited_by UUID REFERENCES auth.users(id),
            
            -- Builder acknowledgement
            acknowledged_at TIMESTAMPTZ,
            acknowledged_by UUID REFERENCES auth.users(id),
            
            -- Metadata
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );
        
        -- Indexes
        CREATE INDEX idx_invoices_po ON invoices(purchase_order_id);
        CREATE INDEX idx_invoices_grn ON invoices(grn_id);
        CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
        CREATE INDEX idx_invoices_builder ON invoices(builder_id);
        CREATE INDEX idx_invoices_status ON invoices(status);
        CREATE INDEX idx_invoices_number ON invoices(invoice_number);
    ELSE
        -- Add missing columns to existing invoices table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'grn_id') THEN
            ALTER TABLE invoices ADD COLUMN grn_id UUID REFERENCES goods_received_notes(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'is_editable') THEN
            ALTER TABLE invoices ADD COLUMN is_editable BOOLEAN DEFAULT TRUE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'last_edited_at') THEN
            ALTER TABLE invoices ADD COLUMN last_edited_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'last_edited_by') THEN
            ALTER TABLE invoices ADD COLUMN last_edited_by UUID REFERENCES auth.users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'acknowledged_at') THEN
            ALTER TABLE invoices ADD COLUMN acknowledged_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invoices' AND column_name = 'acknowledged_by') THEN
            ALTER TABLE invoices ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- ============================================================
-- 4. FUNCTION: Generate DN Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_dn_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_part TEXT;
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(dn_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM delivery_notes
    WHERE dn_number LIKE 'DN-' || year_part || '-%';
    
    new_number := 'DN-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FUNCTION: Generate GRN Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_part TEXT;
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM goods_received_notes
    WHERE grn_number LIKE 'GRN-' || year_part || '-%';
    
    new_number := 'GRN-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. FUNCTION: Auto-create Delivery Note when delivery completed
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_delivery_note()
RETURNS TRIGGER AS $$
DECLARE
    v_po_record RECORD;
    v_dn_number TEXT;
    v_items JSONB;
    v_delivery_request_id UUID;
BEGIN
    -- Only trigger when status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Check if DN already exists for this PO
        IF EXISTS (SELECT 1 FROM delivery_notes WHERE purchase_order_id = NEW.id AND status != 'cancelled') THEN
            RETURN NEW;
        END IF;
        
        -- Get purchase order details
        SELECT 
            po.id,
            po.buyer_id,
            po.supplier_id,
            po.delivery_provider_id,
            po.delivery_address,
            po.items,
            po.created_at
        INTO v_po_record
        FROM purchase_orders po
        WHERE po.id = NEW.id;
        
        IF NOT FOUND OR v_po_record.buyer_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Find associated delivery_request
        SELECT id INTO v_delivery_request_id
        FROM delivery_requests
        WHERE purchase_order_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Generate DN number
        v_dn_number := generate_dn_number();
        
        -- Prepare items from purchase_order
        v_items := COALESCE(v_po_record.items, '[]'::JSONB);
        
        -- Create delivery note (using buyer_id from PO as builder_id)
        INSERT INTO delivery_notes (
            purchase_order_id,
            delivery_request_id,
            dn_number,
            builder_id,
            supplier_id,
            delivery_provider_id,
            delivery_address,
            delivery_date,
            delivery_time,
            items,
            status,
            created_by
        ) VALUES (
            NEW.id,
            v_delivery_request_id,
            v_dn_number,
            v_po_record.buyer_id,  -- buyer_id from PO maps to builder_id in DN
            v_po_record.supplier_id,
            v_po_record.delivery_provider_id,
            v_po_record.delivery_address,
            CURRENT_DATE,
            NOW(),
            v_items,
            'pending_signature',
            auth.uid()
        );
        
        RAISE NOTICE 'Auto-created Delivery Note % for purchase order %', v_dn_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating DN
DROP TRIGGER IF EXISTS trigger_auto_create_dn ON purchase_orders;
CREATE TRIGGER trigger_auto_create_dn
    AFTER UPDATE OF status ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
    EXECUTE FUNCTION auto_create_delivery_note();

-- ============================================================
-- 7. FUNCTION: Auto-create GRN when materials accepted
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_grn_number TEXT;
    v_po_record RECORD;
BEGIN
    -- Only trigger when builder accepts materials
    IF NEW.builder_decision = 'accepted' AND (OLD.builder_decision IS NULL OR OLD.builder_decision != 'accepted') THEN
        -- Check if GRN already exists
        IF EXISTS (SELECT 1 FROM goods_received_notes WHERE delivery_note_id = NEW.id) THEN
            RETURN NEW;
        END IF;
        
        -- Get purchase order details
        SELECT po.* INTO v_po_record
        FROM purchase_orders po
        WHERE po.id = NEW.purchase_order_id;
        
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;
        
        -- Generate GRN number
        v_grn_number := generate_grn_number();
        
        -- Create GRN
        INSERT INTO goods_received_notes (
            delivery_note_id,
            purchase_order_id,
            grn_number,
            builder_id,
            supplier_id,
            items,
            total_quantity,
            received_date,
            received_time,
            status,
            created_by
        ) VALUES (
            NEW.id,
            NEW.purchase_order_id,
            v_grn_number,
            NEW.builder_id,
            NEW.supplier_id,
            NEW.items,
            (SELECT SUM((value->>'quantity')::INTEGER) FROM jsonb_array_elements(NEW.items)),
            CURRENT_DATE,
            NOW(),
            'generated',
            auth.uid()
        );
        
        RAISE NOTICE 'Auto-created GRN % for delivery note %', v_grn_number, NEW.dn_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating GRN
DROP TRIGGER IF EXISTS trigger_auto_create_grn ON delivery_notes;
CREATE TRIGGER trigger_auto_create_grn
    AFTER UPDATE OF builder_decision ON delivery_notes
    FOR EACH ROW
    WHEN (NEW.builder_decision = 'accepted' AND (OLD.builder_decision IS NULL OR OLD.builder_decision != 'accepted'))
    EXECUTE FUNCTION auto_create_grn();

-- ============================================================
-- 8. FUNCTION: Auto-create Invoice when GRN is viewed by supplier
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_number TEXT;
    v_grn_record RECORD;
    v_po_record RECORD;
    v_subtotal DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
BEGIN
    -- Only trigger when supplier views GRN (status changes to 'viewed_by_supplier')
    IF NEW.status = 'viewed_by_supplier' AND (OLD.status IS NULL OR OLD.status != 'viewed_by_supplier') THEN
        -- Check if invoice already exists
        IF EXISTS (SELECT 1 FROM invoices WHERE grn_id = NEW.id AND status != 'cancelled') THEN
            RETURN NEW;
        END IF;
        
        -- Get GRN details (GRN already has all needed info)
        SELECT 
            grn.id,
            grn.purchase_order_id,
            grn.builder_id,
            grn.supplier_id,
            grn.items,
            po.total_amount
        INTO v_grn_record
        FROM goods_received_notes grn
        JOIN purchase_orders po ON po.id = grn.purchase_order_id
        WHERE grn.id = NEW.id;
        
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;
        
        -- Generate invoice number
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO v_invoice_number
        FROM invoices
        WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
        
        v_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_invoice_number::TEXT, 4, '0');
        
        -- Calculate amounts (use PO total as base)
        v_subtotal := COALESCE(v_grn_record.total_amount, 0);
        v_total := v_subtotal; -- Can add tax/discount later
        
        -- Create invoice
        INSERT INTO invoices (
            invoice_number,
            purchase_order_id,
            grn_id,
            supplier_id,
            builder_id,
            items,
            subtotal,
            total_amount,
            invoice_date,
            due_date,
            status,
            payment_status,
            is_editable,
            created_by
        ) VALUES (
            v_invoice_number,
            v_grn_record.purchase_order_id,
            NEW.id,
            v_grn_record.supplier_id,
            v_grn_record.builder_id,
            v_grn_record.items,
            v_subtotal,
            v_total,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days', -- 30 days payment terms
            'draft',
            'pending',
            TRUE,
            auth.uid()
        );
        
        RAISE NOTICE 'Auto-created Invoice % for GRN %', v_invoice_number, NEW.grn_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating invoice
DROP TRIGGER IF EXISTS trigger_auto_create_invoice ON goods_received_notes;
CREATE TRIGGER trigger_auto_create_invoice
    AFTER UPDATE OF status ON goods_received_notes
    FOR EACH ROW
    WHEN (NEW.status = 'viewed_by_supplier' AND (OLD.status IS NULL OR OLD.status != 'viewed_by_supplier'))
    EXECUTE FUNCTION auto_create_invoice();

-- ============================================================
-- 9. FUNCTION: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_delivery_notes_updated_at ON delivery_notes;
CREATE TRIGGER update_delivery_notes_updated_at
    BEFORE UPDATE ON delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grn_updated_at ON goods_received_notes;
CREATE TRIGGER update_grn_updated_at
    BEFORE UPDATE ON goods_received_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Delivery Notes Policies
CREATE POLICY "Builders can view own delivery notes"
    ON delivery_notes FOR SELECT
    USING (builder_id = auth.uid());

CREATE POLICY "Suppliers can view own delivery notes"
    ON delivery_notes FOR SELECT
    USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Builders can update own delivery notes"
    ON delivery_notes FOR UPDATE
    USING (builder_id = auth.uid());

-- GRN Policies
CREATE POLICY "Builders can view own GRNs"
    ON goods_received_notes FOR SELECT
    USING (builder_id = auth.uid());

CREATE POLICY "Suppliers can view own GRNs"
    ON goods_received_notes FOR SELECT
    USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all GRNs"
    ON goods_received_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Invoice Policies
CREATE POLICY "Builders can view own invoices"
    ON invoices FOR SELECT
    USING (builder_id = auth.uid());

CREATE POLICY "Suppliers can view own invoices"
    ON invoices FOR SELECT
    USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Suppliers can update own invoices (when editable)"
    ON invoices FOR UPDATE
    USING (
        supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
        AND is_editable = TRUE
    );

CREATE POLICY "Builders can acknowledge own invoices"
    ON invoices FOR UPDATE
    USING (builder_id = auth.uid())
    WITH CHECK (builder_id = auth.uid());

CREATE POLICY "Admins can view all invoices"
    ON invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON delivery_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON goods_received_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON invoices TO authenticated;
GRANT EXECUTE ON FUNCTION generate_dn_number TO authenticated;
GRANT EXECUTE ON FUNCTION generate_grn_number TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
