-- Function to automatically generate QR codes for purchase order items
CREATE OR REPLACE FUNCTION public.auto_generate_qr_codes_for_purchase_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    item_record RECORD;
    qr_code_result TEXT;
BEGIN
    -- Only generate QR codes for confirmed purchase orders
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Loop through items in the purchase order
        FOR item_record IN 
            SELECT * FROM jsonb_to_recordset(NEW.items) AS items(
                material_type TEXT,
                quantity INTEGER,
                unit TEXT
            )
        LOOP
            -- Generate QR code for each item
            SELECT public.generate_material_qr_code(
                item_record.material_type,
                NULL, -- batch_number
                NEW.supplier_id,
                NEW.id, -- purchase_order_id
                item_record.quantity,
                COALESCE(item_record.unit, 'pieces')
            ) INTO qr_code_result;
            
            -- Log the generated QR code
            RAISE NOTICE 'Generated QR code % for purchase order %', qr_code_result, NEW.po_number;
        END LOOP;
        
        -- Update the purchase order to mark QR codes as generated
        UPDATE purchase_orders 
        SET qr_code_generated = true
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-generate QR codes when purchase order is confirmed
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_codes ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_qr_codes
    AFTER INSERT OR UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_qr_codes_for_purchase_order();

-- Function to get QR codes for a supplier's purchase orders  
CREATE OR REPLACE FUNCTION public.get_supplier_qr_codes(_supplier_id UUID)
RETURNS TABLE(
    qr_code TEXT,
    material_type TEXT,
    quantity INTEGER,
    unit TEXT,
    status TEXT,
    po_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mqc.qr_code,
        mqc.material_type,
        mqc.quantity,
        mqc.unit,
        mqc.status,
        po.po_number,
        mqc.created_at,
        mqc.dispatched_at,
        mqc.received_at
    FROM material_qr_codes mqc
    JOIN purchase_orders po ON po.id = mqc.purchase_order_id
    WHERE mqc.supplier_id = _supplier_id
    ORDER BY mqc.created_at DESC;
END;
$$;