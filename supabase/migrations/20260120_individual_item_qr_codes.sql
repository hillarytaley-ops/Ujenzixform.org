-- =====================================================================
-- INDIVIDUAL ITEM QR CODES - ONE QR CODE PER UNIT
-- =====================================================================
-- This migration updates the QR code system to generate a UNIQUE QR code
-- for EACH individual unit/item, not just per line item.
-- 
-- Example: 100 cement bags = 100 unique QR codes
-- This enables:
-- - Complete item-level accountability
-- - Individual item tracking
-- - Precise tally and records
-- - Damage tracking per unit
-- =====================================================================

-- STEP 1: Update the QR code generation function to create one QR per unit
CREATE OR REPLACE FUNCTION public.generate_individual_qr_codes_for_order(
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
    v_line_item_index INTEGER := 1;
    v_unit_index INTEGER;
    v_qr_code TEXT;
    v_items_created INTEGER := 0;
    v_material_item_id UUID;
    v_item_quantity INTEGER;
    v_timestamp_code TEXT;
    v_supplier_code TEXT;
    v_buyer_code TEXT;
    v_category_code TEXT;
    v_checksum TEXT;
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
    
    -- Get supplier record ID
    SELECT id INTO v_supplier_record_id
    FROM public.suppliers
    WHERE user_id = v_po.supplier_id OR id = v_po.supplier_id;
    
    IF v_supplier_record_id IS NULL THEN
        v_supplier_record_id := v_po.supplier_id;
    END IF;
    
    -- Generate codes for QR format
    v_timestamp_code := TO_CHAR(NOW(), 'YYMMDDHH24MISS');
    v_supplier_code := UPPER(SUBSTRING(v_supplier_record_id::TEXT FROM 1 FOR 4));
    v_buyer_code := UPPER(SUBSTRING(v_po.buyer_id::TEXT FROM 1 FOR 4));
    
    -- Process each line item in the purchase order
    IF v_po.items IS NOT NULL AND jsonb_array_length(v_po.items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_po.items)
        LOOP
            -- Get quantity for this line item
            v_item_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
            
            -- Generate category code
            v_category_code := UPPER(SUBSTRING(
                REGEXP_REPLACE(COALESCE(v_item->>'category', v_item->>'name', 'GEN'), '[^a-zA-Z]', '', 'g') 
                FROM 1 FOR 3
            ));
            IF v_category_code = '' THEN v_category_code := 'GEN'; END IF;
            
            -- CREATE ONE QR CODE FOR EACH INDIVIDUAL UNIT
            FOR v_unit_index IN 1..v_item_quantity
            LOOP
                -- Generate unique checksum for this specific unit
                v_checksum := UPPER(SUBSTRING(MD5(
                    v_supplier_record_id::TEXT || v_po.buyer_id::TEXT || 
                    v_line_item_index::TEXT || v_unit_index::TEXT || 
                    v_timestamp_code || random()::TEXT
                ) FROM 1 FOR 6));
                
                -- Generate unique QR code for this individual unit
                -- Format: UJP-{SUPPLIER}-{BUYER}-{CAT}-{TIMESTAMP}-{LINE}-{UNIT}-{CHECKSUM}
                v_qr_code := 'UJP-' || v_supplier_code || '-' || v_buyer_code || '-' || 
                            v_category_code || '-' || v_timestamp_code || '-' || 
                            LPAD(v_line_item_index::TEXT, 2, '0') || '-' ||
                            LPAD(v_unit_index::TEXT, 4, '0') || '-' || v_checksum;
                
                -- Insert material item for this individual unit
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
                    dispatch_scanned,
                    receive_scanned,
                    qr_code_generated_at
                ) VALUES (
                    p_purchase_order_id,
                    v_qr_code,
                    v_items_created + 1, -- Global sequence across all units
                    COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown Material') || 
                        ' (Unit ' || v_unit_index || ' of ' || v_item_quantity || ')',
                    COALESCE(v_item->>'category', 'General'),
                    1, -- Each QR represents 1 unit
                    COALESCE(v_item->>'unit', 'unit'),
                    v_supplier_record_id,
                    v_po.buyer_id,
                    v_buyer.name,
                    v_buyer.email,
                    v_buyer.phone,
                    COALESCE((v_item->>'unit_price')::NUMERIC, 0),
                    COALESCE((v_item->>'unit_price')::NUMERIC, 0), -- Per unit price
                    'Line item ' || v_line_item_index || ', Unit ' || v_unit_index || ' of ' || v_item_quantity,
                    'pending',
                    false,
                    false,
                    NOW()
                )
                RETURNING id INTO v_material_item_id;
                
                v_items_created := v_items_created + 1;
            END LOOP;
            
            v_line_item_index := v_line_item_index + 1;
        END LOOP;
    END IF;
    
    -- Update purchase order to mark QR codes as generated
    UPDATE public.purchase_orders
    SET qr_code_generated = true
    WHERE id = p_purchase_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'purchase_order_id', p_purchase_order_id,
        'total_qr_codes_created', v_items_created,
        'buyer', jsonb_build_object(
            'id', v_buyer.id,
            'name', v_buyer.name,
            'email', v_buyer.email
        ),
        'message', 'Created ' || v_items_created || ' individual QR codes for complete item tracking'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_individual_qr_codes_for_order TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.generate_individual_qr_codes_for_order IS 
'Generates a UNIQUE QR code for EACH individual unit in a purchase order.
Example: 100 cement bags = 100 unique QR codes.
This enables complete item-level accountability and tracking.';

-- =====================================================================
-- UPDATE THE AUTO-TRIGGER TO USE INDIVIDUAL QR CODES
-- =====================================================================
CREATE OR REPLACE FUNCTION public.auto_generate_individual_qr_codes_on_confirm()
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
        
        PERFORM public.generate_individual_qr_codes_for_order(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_individual_qr_on_confirm ON public.purchase_orders;

CREATE TRIGGER trigger_auto_generate_individual_qr_on_confirm
    AFTER UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_individual_qr_codes_on_confirm();

