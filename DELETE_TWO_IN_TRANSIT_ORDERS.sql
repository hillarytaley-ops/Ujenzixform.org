-- =====================================================================
-- DELETE TWO IN-TRANSIT ORDERS (Supplier QR Code Management)
-- Orders: #PO-1772597930676-IATLA, #QR-1772324057410-ROZCS
-- =====================================================================
-- Run this in Supabase SQL Editor with sufficient privileges.
-- This removes the orders and all related rows (material_items, delivery_requests,
-- order_status_history, and unlinks invoices). delivery_notes/GRNs with
-- ON DELETE CASCADE will be removed when purchase_orders are deleted.
-- =====================================================================

DO $$
DECLARE
  v_po_ids UUID[] := ARRAY(
    SELECT id FROM purchase_orders
    WHERE po_number IN (
      'PO-1772597930676-IATLA',
      'QR-1772324057410-ROZCS'
    )
  );
  v_deleted_osh INT;
  v_deleted_mi INT;
  v_deleted_dr INT;
  v_updated_inv INT;
  v_deleted_po INT;
BEGIN
  IF array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No purchase orders found with po_number IN (PO-1772597930676-IATLA, QR-1772324057410-ROZCS). Nothing to delete.';
    RETURN;
  END IF;

  -- 1. Delete order_status_history (order_id references purchase_orders.id)
  DELETE FROM order_status_history
  WHERE order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_osh = ROW_COUNT;

  -- 2. Delete material_items
  DELETE FROM material_items
  WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_mi = ROW_COUNT;

  -- 3. Delete delivery_requests
  DELETE FROM delivery_requests
  WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_dr = ROW_COUNT;

  -- 4. Unlink invoices (so we can delete purchase_orders)
  UPDATE invoices
  SET purchase_order_id = NULL
  WHERE purchase_order_id = ANY(v_po_ids);
  GET DIAGNOSTICS v_updated_inv = ROW_COUNT;

  -- 5. Delete delivery_notes and goods_received_notes (in case CASCADE is not on)
  DELETE FROM delivery_notes   WHERE purchase_order_id = ANY(v_po_ids);
  DELETE FROM goods_received_notes WHERE purchase_order_id = ANY(v_po_ids);

  -- 6. Delete purchase_orders
  DELETE FROM purchase_orders
  WHERE id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_po = ROW_COUNT;

  RAISE NOTICE 'Deleted: % order_status_history, % material_items, % delivery_requests, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_po, v_updated_inv;
END $$;
