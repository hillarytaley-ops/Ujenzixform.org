-- ============================================================
-- Fix: auto_create_delivery_note() must set delivery_note_number (NOT NULL)
-- INSERT was failing with 23502 when column exists and is NOT NULL.
-- Created: March 18, 2026
-- ============================================================

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
            created_by
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
            auth.uid()
        );

        RAISE NOTICE 'Auto-created Delivery Note % for purchase order %', v_dn_number, NEW.id;
    END IF;

    RETURN NEW;
END;
$$;
