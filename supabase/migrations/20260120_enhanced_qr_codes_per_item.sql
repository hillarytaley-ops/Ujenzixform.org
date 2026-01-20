-- =====================================================================
-- ENHANCED QR CODE SYSTEM - PER ITEM WITH CLIENT IDENTITY
-- =====================================================================
-- Features:
-- 1. Unique QR code for EACH individual item (not per category)
-- 2. Client/Buyer identity embedded in QR code
-- 3. One-time scan validation (QR can only be scanned once per scan type)
-- 4. Full audit trail of scans
-- =====================================================================

-- STEP 1: Add new columns to material_items for enhanced tracking
ALTER TABLE public.material_items 
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS buyer_email TEXT,
ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
ADD COLUMN IF NOT EXISTS item_unit_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS item_total_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispatch_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispatch_scanned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dispatch_scanned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS receive_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receive_scanned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS receive_scanned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS item_description TEXT;

-- STEP 2: Add index for faster buyer lookups
CREATE INDEX IF NOT EXISTS idx_material_items_buyer_id ON public.material_items(buyer_id);
CREATE INDEX IF NOT EXISTS idx_material_items_buyer_email ON public.material_items(buyer_email);

-- STEP 3: Create function to generate unique QR code with client identity
-- Format: UJP-{SUPPLIER_CODE}-{BUYER_CODE}-{CATEGORY}-{TIMESTAMP}-{ITEM_SEQ}-{CHECKSUM}
CREATE OR REPLACE FUNCTION public.generate_item_qr_code_with_identity(
    p_supplier_id UUID,
    p_buyer_id UUID,
    p_category TEXT,
    p_item_sequence INTEGER,
    p_purchase_order_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    supplier_code TEXT;
    buyer_code TEXT;
    category_code TEXT;
    timestamp_code TEXT;
    checksum TEXT;
    full_qr_code TEXT;
BEGIN
    -- Generate supplier code (first 4 chars of supplier ID)
    supplier_code := UPPER(SUBSTRING(p_supplier_id::TEXT FROM 1 FOR 4));
    
    -- Generate buyer code (first 4 chars of buyer ID)
    buyer_code := UPPER(SUBSTRING(p_buyer_id::TEXT FROM 1 FOR 4));
    
    -- Generate category code (first 3 chars, uppercase)
    category_code := UPPER(SUBSTRING(REGEXP_REPLACE(p_category, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
    IF category_code = '' THEN category_code := 'GEN'; END IF;
    
    -- Generate timestamp code (YYMMDDHHMMSS)
    timestamp_code := TO_CHAR(NOW(), 'YYMMDDHH24MISS');
    
    -- Generate checksum (hash of all components)
    checksum := UPPER(SUBSTRING(MD5(
        p_supplier_id::TEXT || p_buyer_id::TEXT || p_category || 
        p_item_sequence::TEXT || p_purchase_order_id::TEXT || timestamp_code
    ) FROM 1 FOR 6));
    
    -- Combine into full QR code
    -- Format: UJP-{SUPPLIER}-{BUYER}-{CAT}-{TIMESTAMP}-{SEQ}-{CHECKSUM}
    full_qr_code := 'UJP-' || supplier_code || '-' || buyer_code || '-' || 
                    category_code || '-' || timestamp_code || '-' || 
                    LPAD(p_item_sequence::TEXT, 4, '0') || '-' || checksum;
    
    RETURN full_qr_code;
END;
$$;

-- STEP 4: Create function to validate one-time scan
CREATE OR REPLACE FUNCTION public.validate_and_record_qr_scan(
    p_qr_code TEXT,
    p_scan_type TEXT, -- 'dispatch' or 'receiving' or 'verification'
    p_scanned_by UUID,
    p_scanner_device_id TEXT DEFAULT NULL,
    p_scan_location JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_material_item RECORD;
    v_result JSONB;
    v_scan_event_id UUID;
    v_buyer_info JSONB;
BEGIN
    -- Find the material item
    SELECT * INTO v_material_item
    FROM public.material_items
    WHERE qr_code = p_qr_code;
    
    IF v_material_item IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'QR code not found',
            'error_code', 'QR_NOT_FOUND'
        );
    END IF;
    
    -- Check if already scanned for this scan type
    IF p_scan_type = 'dispatch' THEN
        IF v_material_item.dispatch_scanned = true THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'This QR code has already been scanned for dispatch',
                'error_code', 'ALREADY_DISPATCHED',
                'scanned_at', v_material_item.dispatch_scanned_at,
                'scanned_by', v_material_item.dispatch_scanned_by
            );
        END IF;
        
        -- Record dispatch scan
        UPDATE public.material_items
        SET 
            dispatch_scanned = true,
            dispatch_scanned_at = NOW(),
            dispatch_scanned_by = p_scanned_by,
            status = 'dispatched',
            updated_at = NOW()
        WHERE id = v_material_item.id;
        
    ELSIF p_scan_type = 'receiving' THEN
        IF v_material_item.receive_scanned = true THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'This QR code has already been scanned for receiving',
                'error_code', 'ALREADY_RECEIVED',
                'scanned_at', v_material_item.receive_scanned_at,
                'scanned_by', v_material_item.receive_scanned_by
            );
        END IF;
        
        -- Check if dispatch scan was done first
        IF v_material_item.dispatch_scanned = false THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'This item has not been dispatched yet. Dispatch scan required first.',
                'error_code', 'NOT_DISPATCHED'
            );
        END IF;
        
        -- Record receiving scan
        UPDATE public.material_items
        SET 
            receive_scanned = true,
            receive_scanned_at = NOW(),
            receive_scanned_by = p_scanned_by,
            status = 'received',
            updated_at = NOW()
        WHERE id = v_material_item.id;
    END IF;
    
    -- Record scan event in qr_scan_events table
    INSERT INTO public.qr_scan_events (
        qr_code,
        scan_type,
        scanned_by,
        scanner_device_id,
        scan_location,
        notes,
        scanned_at
    ) VALUES (
        p_qr_code,
        p_scan_type,
        p_scanned_by,
        p_scanner_device_id,
        p_scan_location,
        p_notes,
        NOW()
    )
    RETURNING id INTO v_scan_event_id;
    
    -- Build buyer info for response
    v_buyer_info := jsonb_build_object(
        'buyer_id', v_material_item.buyer_id,
        'buyer_name', v_material_item.buyer_name,
        'buyer_email', v_material_item.buyer_email,
        'buyer_phone', v_material_item.buyer_phone
    );
    
    -- Return success with item details
    RETURN jsonb_build_object(
        'success', true,
        'scan_event_id', v_scan_event_id,
        'item_id', v_material_item.id,
        'material_type', v_material_item.material_type,
        'category', v_material_item.category,
        'quantity', v_material_item.quantity,
        'unit', v_material_item.unit,
        'status', CASE 
            WHEN p_scan_type = 'dispatch' THEN 'dispatched'
            WHEN p_scan_type = 'receiving' THEN 'received'
            ELSE v_material_item.status
        END,
        'buyer', v_buyer_info,
        'supplier_id', v_material_item.supplier_id,
        'purchase_order_id', v_material_item.purchase_order_id,
        'scanned_at', NOW()
    );
END;
$$;

-- STEP 5: Create function to generate QR codes for all items in a purchase order
CREATE OR REPLACE FUNCTION public.generate_qr_codes_for_purchase_order(
    p_purchase_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po RECORD;
    v_buyer RECORD;
    v_supplier_record_id UUID;
    v_item JSONB;
    v_item_index INTEGER := 1;
    v_qr_code TEXT;
    v_items_created INTEGER := 0;
    v_material_item_id UUID;
BEGIN
    -- Get purchase order details
    SELECT * INTO v_po
    FROM public.purchase_orders
    WHERE id = p_purchase_order_id;
    
    IF v_po IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Purchase order not found'
        );
    END IF;
    
    -- Get buyer details
    SELECT 
        u.id,
        COALESCE(p.full_name, p.company_name, u.email) as name,
        u.email,
        p.phone
    INTO v_buyer
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = v_po.buyer_id;
    
    -- Get supplier record ID (material_items.supplier_id references suppliers.id, not auth.users.id)
    SELECT id INTO v_supplier_record_id
    FROM public.suppliers
    WHERE user_id = v_po.supplier_id OR id = v_po.supplier_id;
    
    IF v_supplier_record_id IS NULL THEN
        v_supplier_record_id := v_po.supplier_id; -- Fallback to supplier_id if no record found
    END IF;
    
    -- Process each item in the purchase order's items JSONB array
    IF v_po.items IS NOT NULL AND jsonb_array_length(v_po.items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_po.items)
        LOOP
            -- Generate unique QR code for this item
            v_qr_code := public.generate_item_qr_code_with_identity(
                v_supplier_record_id,
                v_po.buyer_id,
                COALESCE(v_item->>'category', v_item->>'name', 'GENERAL'),
                v_item_index,
                p_purchase_order_id
            );
            
            -- Insert material item with buyer identity
            INSERT INTO public.material_items (
                purchase_order_id,
                qr_code,
                item_sequence,
                material_type,
                category,
                quantity,
                unit,
                supplier_id,
                buyer_id,
                buyer_name,
                buyer_email,
                buyer_phone,
                item_unit_price,
                item_total_price,
                item_description,
                status,
                qr_code_generated_at
            ) VALUES (
                p_purchase_order_id,
                v_qr_code,
                v_item_index,
                COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown Material'),
                COALESCE(v_item->>'category', 'General'),
                COALESCE((v_item->>'quantity')::NUMERIC, 1),
                COALESCE(v_item->>'unit', 'units'),
                v_supplier_record_id,
                v_po.buyer_id,
                v_buyer.name,
                v_buyer.email,
                v_buyer.phone,
                COALESCE((v_item->>'unit_price')::NUMERIC, 0),
                COALESCE((v_item->>'total')::NUMERIC, (v_item->>'unit_price')::NUMERIC * (v_item->>'quantity')::NUMERIC, 0),
                v_item->>'description',
                'pending',
                NOW()
            )
            RETURNING id INTO v_material_item_id;
            
            v_items_created := v_items_created + 1;
            v_item_index := v_item_index + 1;
        END LOOP;
    END IF;
    
    -- Update purchase order to mark QR codes as generated
    UPDATE public.purchase_orders
    SET qr_code_generated = true
    WHERE id = p_purchase_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'purchase_order_id', p_purchase_order_id,
        'items_created', v_items_created,
        'buyer', jsonb_build_object(
            'id', v_buyer.id,
            'name', v_buyer.name,
            'email', v_buyer.email
        )
    );
END;
$$;

-- STEP 6: Create trigger to auto-generate QR codes when purchase order is confirmed
CREATE OR REPLACE FUNCTION public.auto_generate_qr_codes_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only generate QR codes when status changes to 'confirmed' and QR codes haven't been generated yet
    IF NEW.status = 'confirmed' AND 
       (OLD.status IS NULL OR OLD.status != 'confirmed') AND
       (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = false) THEN
        
        PERFORM public.generate_qr_codes_for_purchase_order(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON public.purchase_orders;

-- Create new trigger
CREATE TRIGGER trigger_auto_generate_qr_on_confirm
    AFTER UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_qr_codes_on_confirm();

-- STEP 7: Create view for supplier to see QR codes with client info
CREATE OR REPLACE VIEW public.supplier_qr_codes_with_clients AS
SELECT 
    mi.id,
    mi.qr_code,
    mi.material_type,
    mi.category,
    mi.quantity,
    mi.unit,
    mi.status,
    mi.buyer_id,
    mi.buyer_name,
    mi.buyer_email,
    mi.buyer_phone,
    mi.item_unit_price,
    mi.item_total_price,
    mi.dispatch_scanned,
    mi.dispatch_scanned_at,
    mi.receive_scanned,
    mi.receive_scanned_at,
    mi.qr_code_generated_at,
    mi.supplier_id,
    mi.purchase_order_id,
    po.po_number,
    po.delivery_address,
    po.delivery_date,
    s.company_name as supplier_name
FROM public.material_items mi
JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN public.suppliers s ON s.id = mi.supplier_id;

-- STEP 8: Create function for suppliers to get their QR codes grouped by client
CREATE OR REPLACE FUNCTION public.get_supplier_qr_codes_by_client(
    p_supplier_id UUID
)
RETURNS TABLE (
    buyer_id UUID,
    buyer_name TEXT,
    buyer_email TEXT,
    buyer_phone TEXT,
    total_items BIGINT,
    pending_items BIGINT,
    dispatched_items BIGINT,
    received_items BIGINT,
    items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.buyer_id,
        mi.buyer_name,
        mi.buyer_email,
        mi.buyer_phone,
        COUNT(*)::BIGINT as total_items,
        COUNT(*) FILTER (WHERE mi.status = 'pending')::BIGINT as pending_items,
        COUNT(*) FILTER (WHERE mi.status = 'dispatched')::BIGINT as dispatched_items,
        COUNT(*) FILTER (WHERE mi.status = 'received')::BIGINT as received_items,
        jsonb_agg(jsonb_build_object(
            'id', mi.id,
            'qr_code', mi.qr_code,
            'material_type', mi.material_type,
            'category', mi.category,
            'quantity', mi.quantity,
            'unit', mi.unit,
            'status', mi.status,
            'dispatch_scanned', mi.dispatch_scanned,
            'receive_scanned', mi.receive_scanned,
            'item_unit_price', mi.item_unit_price,
            'item_total_price', mi.item_total_price,
            'po_number', po.po_number
        ) ORDER BY mi.created_at DESC) as items
    FROM public.material_items mi
    JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
    WHERE mi.supplier_id = p_supplier_id
    GROUP BY mi.buyer_id, mi.buyer_name, mi.buyer_email, mi.buyer_phone;
END;
$$;

-- STEP 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_item_qr_code_with_identity TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_record_qr_scan TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_qr_codes_for_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_qr_codes_by_client TO authenticated;

-- STEP 10: Add comments for documentation
COMMENT ON FUNCTION public.generate_item_qr_code_with_identity IS 
'Generates a unique QR code for each item with embedded supplier and buyer identity.
Format: UJP-{SUPPLIER_CODE}-{BUYER_CODE}-{CATEGORY}-{TIMESTAMP}-{ITEM_SEQ}-{CHECKSUM}';

COMMENT ON FUNCTION public.validate_and_record_qr_scan IS 
'Validates and records a QR code scan. Each QR code can only be scanned ONCE per scan type (dispatch/receiving).
Returns error if already scanned, otherwise records the scan and updates item status.';

COMMENT ON FUNCTION public.generate_qr_codes_for_purchase_order IS 
'Generates unique QR codes for ALL items in a purchase order with buyer identity embedded.
Called automatically when purchase order status changes to confirmed.';

-- =====================================================================
-- SUMMARY OF CHANGES:
-- =====================================================================
-- 1. Added buyer identity columns to material_items table
-- 2. Added one-time scan tracking columns (dispatch_scanned, receive_scanned)
-- 3. Created generate_item_qr_code_with_identity() - unique QR per item with client ID
-- 4. Created validate_and_record_qr_scan() - validates one-time scan
-- 5. Created generate_qr_codes_for_purchase_order() - generates QR for all items
-- 6. Created trigger to auto-generate QR codes on order confirmation
-- 7. Created view for suppliers to see QR codes with client info
-- 8. Created function to get QR codes grouped by client
-- =====================================================================

