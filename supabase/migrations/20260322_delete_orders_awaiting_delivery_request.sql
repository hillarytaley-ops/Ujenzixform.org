-- =====================================================================
-- DELETE ORDERS AWAITING DELIVERY REQUEST
-- =====================================================================
-- Deletes these 4 orders from Professional Builder Dashboard:
-- 1. QR-1773660469560-ABKUM
-- 2. QR-1773664196605-ZW1JZ
-- 3. QR-1773662444335-FKGSY
-- 4. QR-1773658205465-S57VD
-- =====================================================================

DO $$
DECLARE
    po_ids UUID[];
    dr_ids UUID[];
    po_nums TEXT[] := ARRAY[
        'QR-1773660469560-ABKUM',
        'QR-1773664196605-ZW1JZ',
        'QR-1773662444335-FKGSY',
        'QR-1773658205465-S57VD'
    ];
BEGIN
    -- Collect purchase_order IDs by po_number
    SELECT ARRAY_AGG(id) INTO po_ids
    FROM purchase_orders
    WHERE po_number = ANY(po_nums);

    IF po_ids IS NULL OR array_length(po_ids, 1) IS NULL THEN
        RAISE NOTICE 'No matching purchase orders found';
        RETURN;
    END IF;

    RAISE NOTICE 'Found % purchase orders to delete', array_length(po_ids, 1);

    -- Get delivery_request IDs for these purchase orders
    SELECT ARRAY_AGG(id) INTO dr_ids
    FROM delivery_requests
    WHERE purchase_order_id = ANY(po_ids);

    -- Delete tracking_numbers (by delivery_request_id)
    IF dr_ids IS NOT NULL AND array_length(dr_ids, 1) > 0 THEN
        BEGIN
            DELETE FROM tracking_numbers WHERE delivery_request_id = ANY(dr_ids);
            RAISE NOTICE 'Deleted tracking_numbers';
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    END IF;

    -- Delete delivery_tracking (by delivery_id = delivery_request id)
    IF dr_ids IS NOT NULL AND array_length(dr_ids, 1) > 0 THEN
        BEGIN
            DELETE FROM delivery_tracking WHERE delivery_id = ANY(dr_ids);
            RAISE NOTICE 'Deleted delivery_tracking';
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    END IF;

    -- Delete delivery_requests
    DELETE FROM delivery_requests WHERE purchase_order_id = ANY(po_ids);
    RAISE NOTICE 'Deleted delivery_requests';

    -- Delete material_qr_codes
    BEGIN
        DELETE FROM material_qr_codes WHERE purchase_order_id = ANY(po_ids);
        RAISE NOTICE 'Deleted material_qr_codes';
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- Delete material_items
    BEGIN
        DELETE FROM material_items WHERE purchase_order_id = ANY(po_ids);
        RAISE NOTICE 'Deleted material_items';
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- Delete delivery_notes
    BEGIN
        DELETE FROM delivery_notes WHERE purchase_order_id = ANY(po_ids);
        RAISE NOTICE 'Deleted delivery_notes';
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- Delete notifications (schema may vary; skip if column/structure differs)
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_id'
        ) THEN
            DELETE FROM notifications
            WHERE related_id = ANY(ARRAY(SELECT p::TEXT FROM unnest(po_ids) p));
            RAISE NOTICE 'Deleted notifications';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped notifications (column/structure may differ): %', SQLERRM;
    END;

    -- Delete purchase_orders
    DELETE FROM purchase_orders WHERE id = ANY(po_ids);
    RAISE NOTICE 'Deleted % purchase_orders', array_length(po_ids, 1);

END $$;
