-- =====================================================================
-- DELETE TWO STUCK DELIVERY-SCANNER ORDERS (QR line items / permissions)
-- =====================================================================
-- Removes purchase orders and dependent rows for:
--   QR-1774057242032-S8TC7
--   QR-1773733176051-6D4XW
-- (UI may show a leading #; both forms are matched.)
-- =====================================================================

DO $$
DECLARE
    po_ids UUID[];
    dr_ids UUID[];
    po_nums TEXT[] := ARRAY[
        'QR-1774057242032-S8TC7',
        'QR-1773733176051-6D4XW',
        '#QR-1774057242032-S8TC7',
        '#QR-1773733176051-6D4XW'
    ];
BEGIN
    SELECT ARRAY_AGG(DISTINCT id) INTO po_ids
    FROM purchase_orders
    WHERE po_number = ANY(po_nums)
       OR trim(both '#' from po_number) = ANY(ARRAY[
            'QR-1774057242032-S8TC7',
            'QR-1773733176051-6D4XW'
          ]);

    IF po_ids IS NULL OR array_length(po_ids, 1) IS NULL THEN
        RAISE NOTICE 'No matching purchase_orders for QR-1774057242032-S8TC7 / QR-1773733176051-6D4XW. Nothing to delete.';
        RETURN;
    END IF;

    RAISE NOTICE 'Deleting % purchase order(s) for delivery scanner cleanup.', array_length(po_ids, 1);

    SELECT ARRAY_AGG(id) INTO dr_ids
    FROM delivery_requests
    WHERE purchase_order_id = ANY(po_ids);

    IF dr_ids IS NOT NULL AND array_length(dr_ids, 1) > 0 THEN
        BEGIN
            DELETE FROM tracking_numbers WHERE delivery_request_id = ANY(dr_ids);
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
        BEGIN
            DELETE FROM tracking_numbers WHERE purchase_order_id = ANY(po_ids);
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
        BEGIN
            DELETE FROM delivery_tracking WHERE delivery_id = ANY(dr_ids);
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    END IF;

    BEGIN
        DELETE FROM order_status_history WHERE order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    DELETE FROM delivery_requests WHERE purchase_order_id = ANY(po_ids);

    BEGIN
        DELETE FROM material_qr_codes WHERE purchase_order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        DELETE FROM material_items WHERE purchase_order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        DELETE FROM delivery_notes WHERE purchase_order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        DELETE FROM goods_received_notes WHERE purchase_order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        UPDATE invoices SET purchase_order_id = NULL WHERE purchase_order_id = ANY(po_ids);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_id'
        ) THEN
            DELETE FROM notifications
            WHERE related_id = ANY(ARRAY(SELECT p::TEXT FROM unnest(po_ids) p));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped notifications: %', SQLERRM;
    END;

    DELETE FROM purchase_orders WHERE id = ANY(po_ids);

    RAISE NOTICE 'Finished deleting purchase_orders and related rows.';
END $$;
