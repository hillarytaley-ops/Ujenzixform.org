-- =====================================================================
-- DELETE PURCHASE ORDER FOR "Film Coated Residential Steel Entrance Door"
-- ALERT CARD (project one - Eldoret, ~Ksh 22,100)
-- =====================================================================
-- Removes the purchase order and dependent rows so the Alerts card
-- disappears (same pattern as 20260427120000_delete_two_delivery_scanner_stuck_orders).
--
-- Matching (all must hold):
--   - delivery_address contains Eldoret and "project one" (spacing variants OK)
--   - total_amount between 21,800 and 22,500 (covers 22,100), OR a material_items
--     row on that PO mentions film-coated / residential steel entrance door
-- Only the NEWEST matching row is deleted (LIMIT 1) to avoid wiping multiple jobs.
--
-- Preview (run in SQL Editor first if unsure):
--   SELECT id, po_number, status, delivery_address, total_amount, created_at
--   FROM purchase_orders po
--   WHERE po.delivery_address IS NOT NULL
--     AND po.delivery_address ILIKE '%eldoret%'
--     AND po.delivery_address ILIKE '%project%one%'
--     AND (
--       (po.total_amount IS NOT NULL AND po.total_amount::numeric BETWEEN 21800 AND 22500)
--       OR EXISTS (
--         SELECT 1 FROM material_items mi
--         WHERE mi.purchase_order_id = po.id
--           AND (
--             mi.material_type ILIKE '%film coated%'
--             OR mi.material_type ILIKE '%residential steel entrance door%'
--           )
--       )
--     )
--   ORDER BY created_at DESC;
-- =====================================================================

DO $$
DECLARE
    po_ids UUID[];
    dr_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id) INTO po_ids
    FROM (
        SELECT po.id
        FROM purchase_orders po
        WHERE po.delivery_address IS NOT NULL
          AND po.delivery_address ILIKE '%eldoret%'
          AND po.delivery_address ILIKE '%project%one%'
          AND (
              (po.total_amount IS NOT NULL AND po.total_amount::numeric BETWEEN 21800 AND 22500)
              OR EXISTS (
                  SELECT 1
                  FROM material_items mi
                  WHERE mi.purchase_order_id = po.id
                    AND (
                        mi.material_type ILIKE '%film coated%'
                        OR mi.material_type ILIKE '%residential steel entrance door%'
                    )
              )
          )
        ORDER BY po.created_at DESC
        LIMIT 1
    ) picked;

    IF po_ids IS NULL OR array_length(po_ids, 1) IS NULL THEN
        RAISE NOTICE 'No purchase_orders matched Film Coated / project one Eldoret / ~22100. Nothing deleted.';
        RETURN;
    END IF;

    RAISE NOTICE 'Deleting % purchase order(s) for Film Coated Eldoret card.', array_length(po_ids, 1);

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

    RAISE NOTICE 'Finished deleting purchase_orders and related rows for Film Coated Eldoret card.';
END $$;
