-- =====================================================================
-- DELETE THE TWO "2 LEVER MORTISE" ORDERS FOR hillarykaptingei@gmail.com
-- =====================================================================
-- Run this in Supabase SQL Editor (e.g. with service role).
-- Removes only purchase orders for this client that have material_items
-- with material_type containing "Lever Mortise" (the two dispatched items
-- shown in the QR/delivery UI). Leaves other orders for this client intact.
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
  v_deleted_qr INT;
BEGIN
  -- Resolve buyer from email (profiles.id or auth.users.id as buyer_id)
  SELECT p.id INTO v_buyer_id
  FROM profiles p
  WHERE p.email = 'hillarykaptingei@gmail.com'
  LIMIT 1;

  IF v_buyer_id IS NULL THEN
    SELECT id INTO v_buyer_id FROM auth.users WHERE email = 'hillarykaptingei@gmail.com' LIMIT 1;
  END IF;

  IF v_buyer_id IS NULL THEN
    RAISE NOTICE 'No user found with email hillarykaptingei@gmail.com. Nothing to delete.';
    RETURN;
  END IF;

  -- Only POs for this buyer that have at least one "Lever Mortise" material item
  v_po_ids := ARRAY(
    SELECT DISTINCT po.id
    FROM purchase_orders po
    JOIN material_items mi ON mi.purchase_order_id = po.id
    WHERE po.buyer_id = v_buyer_id
      AND (mi.material_type ILIKE '%Lever Mortise%' OR mi.material_type ILIKE '%2 Lever Mortise%')
  );

  IF v_po_ids IS NULL OR array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No orders with "Lever Mortise" found for hillarykaptingei@gmail.com. Nothing to delete.';
    RETURN;
  END IF;

  RAISE NOTICE 'Deleting % purchase order(s) (2 Lever Mortise) for hillarykaptingei@gmail.com', array_length(v_po_ids, 1);

  -- 0. Unlink scan refs on material_items then remove scan events for those items
  UPDATE material_items SET dispatch_scan_id = NULL, receiving_scan_id = NULL, verification_scan_id = NULL WHERE purchase_order_id = ANY(v_po_ids);
  DELETE FROM qr_scan_events WHERE qr_code IN (SELECT qr_code FROM material_items WHERE purchase_order_id = ANY(v_po_ids));
  GET DIAGNOSTICS v_deleted_qr = ROW_COUNT;
  RAISE NOTICE 'Deleted % qr_scan_events', v_deleted_qr;

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

  RAISE NOTICE 'Done. Deleted: % order_status_history, % material_items, % delivery_requests, % delivery_notes, % goods_received_notes, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_dn, v_deleted_grn, v_deleted_po, v_updated_inv;
END $$;
