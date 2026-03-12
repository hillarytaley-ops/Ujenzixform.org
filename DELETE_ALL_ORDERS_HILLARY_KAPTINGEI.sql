-- =====================================================================
-- DELETE ALL ORDERS FOR hillarykaptingei@gmail.com (Orders tab / Dashboard)
-- =====================================================================
-- Run this in Supabase SQL Editor with sufficient privileges (e.g. service role).
-- Removes every purchase order where the buyer (builder) is the user with
-- email hillarykaptingei@gmail.com, plus all related rows.
-- =====================================================================

DO $$
DECLARE
  v_buyer_id UUID;
  v_po_ids UUID[];
  v_deleted_osh INT;
  v_deleted_mi INT;
  v_deleted_dr INT;
  v_updated_inv INT;
  v_deleted_dn INT;
  v_deleted_grn INT;
  v_deleted_po INT;
BEGIN
  -- Resolve buyer_id from email (auth.users)
  SELECT id INTO v_buyer_id
  FROM auth.users
  WHERE email = 'hillarykaptingei@gmail.com'
  LIMIT 1;

  IF v_buyer_id IS NULL THEN
    RAISE NOTICE 'No user found with email hillarykaptingei@gmail.com. Nothing to delete.';
    RETURN;
  END IF;

  -- All purchase_orders for this buyer
  v_po_ids := ARRAY(SELECT id FROM purchase_orders WHERE buyer_id = v_buyer_id);

  IF array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No orders found for hillarykaptingei@gmail.com. Nothing to delete.';
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

  RAISE NOTICE 'Deleted all orders for hillarykaptingei@gmail.com: % order_status_history, % material_items, % delivery_requests, % delivery_notes, % goods_received_notes, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_dn, v_deleted_grn, v_deleted_po, v_updated_inv;
END $$;
