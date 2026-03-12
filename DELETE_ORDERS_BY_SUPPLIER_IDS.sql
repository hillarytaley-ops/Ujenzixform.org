-- =====================================================================
-- DELETE ORDERS BY SUPPLIER_ID (from diagnostic – "NO MATCH" IDs)
-- =====================================================================
-- These supplier_id values appeared on the orders but did not match
-- Eldoret Hardware in suppliers/profiles. This script deletes all
-- purchase_orders (and related data) for these two IDs so the
-- dashboard (Overview / Quotes) is cleared.
--
-- supplier_id 59938adb-3815-4ded-8058-051aa13204c6 (3 orders)
-- supplier_id 91623c3b-d44b-46d4-9cf1-b662084d03da (7 orders)
-- =====================================================================

DO $$
DECLARE
  v_po_ids UUID[];
  v_deleted_osh INT;
  v_deleted_mi INT;
  v_deleted_dr INT;
  v_updated_inv INT;
  v_deleted_dn INT;
  v_deleted_grn INT;
  v_deleted_po INT;
BEGIN
  -- All purchase_orders for these two supplier_id values
  v_po_ids := ARRAY(
    SELECT id FROM purchase_orders
    WHERE supplier_id IN (
      '59938adb-3815-4ded-8058-051aa13204c6',
      '91623c3b-d44b-46d4-9cf1-b662084d03da'
    )
  );

  IF array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No purchase_orders found for those supplier_ids.';
    RETURN;
  END IF;

  -- 1. order_status_history
  DELETE FROM order_status_history WHERE order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_osh = ROW_COUNT;

  -- 2. material_items
  DELETE FROM material_items WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_mi = ROW_COUNT;

  -- 3. delivery_requests
  DELETE FROM delivery_requests WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_dr = ROW_COUNT;

  -- 4. Unlink invoices
  UPDATE invoices SET purchase_order_id = NULL WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_updated_inv = ROW_COUNT;

  -- 5. delivery_notes and goods_received_notes
  DELETE FROM delivery_notes WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_dn = ROW_COUNT;
  DELETE FROM goods_received_notes WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_grn = ROW_COUNT;

  -- 6. purchase_orders
  DELETE FROM purchase_orders WHERE id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_po = ROW_COUNT;

  RAISE NOTICE 'Deleted: % order_status_history, % material_items, % delivery_requests, % delivery_notes, % goods_received_notes, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_dn, v_deleted_grn, v_deleted_po, v_updated_inv;
END $$;
