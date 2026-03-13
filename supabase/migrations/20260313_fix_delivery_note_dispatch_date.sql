-- ============================================================
-- Fix: auto_create_delivery_note() must set dispatch_date if column exists
-- Error: null value in column "dispatch_date" violates not-null constraint
-- Created: March 13, 2026
-- ============================================================

-- Update auto_create_delivery_note to set dispatch_date if column exists
CREATE OR REPLACE FUNCTION public.auto_create_delivery_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po_builder_id UUID;
    v_po_supplier_id UUID;
    v_po_delivery_provider_id UUID;
    v_po_delivery_address TEXT;
    v_po_items JSONB;
    v_dn_number TEXT;
    v_items JSONB;
    v_delivery_request_id UUID;
    v_has_dispatch_date BOOLEAN;
    v_insert_columns TEXT;
    v_insert_values TEXT;
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        IF EXISTS (SELECT 1 FROM delivery_notes WHERE purchase_order_id = NEW.id AND status != 'cancelled') THEN
            RETURN NEW;
        END IF;

        SELECT
            po.buyer_id,
            po.supplier_id,
            po.delivery_provider_id,
            po.delivery_address,
            po.items
        INTO
            v_po_builder_id,
            v_po_supplier_id,
            v_po_delivery_provider_id,
            v_po_delivery_address,
            v_po_items
        FROM purchase_orders po
        WHERE po.id = NEW.id;

        IF NOT FOUND OR v_po_builder_id IS NULL THEN
            RETURN NEW;
        END IF;

        SELECT id INTO v_delivery_request_id
        FROM delivery_requests
        WHERE purchase_order_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        v_dn_number := generate_dn_number();
        v_items := COALESCE(v_po_items, '[]'::JSONB);

        -- Check if dispatch_date column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'delivery_notes' 
            AND column_name = 'dispatch_date'
        ) INTO v_has_dispatch_date;

        -- Build dynamic INSERT based on whether dispatch_date exists
        IF v_has_dispatch_date THEN
            INSERT INTO delivery_notes (
                purchase_order_id,
                delivery_request_id,
                dn_number,
                delivery_note_number,
                builder_id,
                supplier_id,
                delivery_provider_id,
                delivery_address,
                delivery_date,
                delivery_time,
                dispatch_date,
                items,
                status,
                created_by,
                file_path,
                file_name
            ) VALUES (
                NEW.id,
                v_delivery_request_id,
                v_dn_number,
                v_dn_number,
                v_po_builder_id,
                v_po_supplier_id,
                v_po_delivery_provider_id,
                v_po_delivery_address,
                CURRENT_DATE,
                NOW(),
                CURRENT_DATE, -- Set dispatch_date to current date
                v_items,
                'pending_signature',
                auth.uid(),
                COALESCE(v_dn_number || '.pdf', ''),
                COALESCE(v_dn_number || '.pdf', 'delivery_note.pdf')
            );
        ELSE
            -- Original INSERT without dispatch_date
            INSERT INTO delivery_notes (
                purchase_order_id,
                delivery_request_id,
                dn_number,
                delivery_note_number,
                builder_id,
                supplier_id,
                delivery_provider_id,
                delivery_address,
                delivery_date,
                delivery_time,
                items,
                status,
                created_by,
                file_path,
                file_name
            ) VALUES (
                NEW.id,
                v_delivery_request_id,
                v_dn_number,
                v_dn_number,
                v_po_builder_id,
                v_po_supplier_id,
                v_po_delivery_provider_id,
                v_po_delivery_address,
                CURRENT_DATE,
                NOW(),
                v_items,
                'pending_signature',
                auth.uid(),
                COALESCE(v_dn_number || '.pdf', ''),
                COALESCE(v_dn_number || '.pdf', 'delivery_note.pdf')
            );
        END IF;

        RAISE NOTICE 'Auto-created Delivery Note % for purchase order %', v_dn_number, NEW.id;
    END IF;

    RETURN NEW;
END;
$$;
