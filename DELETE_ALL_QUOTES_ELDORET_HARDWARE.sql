-- =====================================================================
-- DELETE ALL QUOTES UNDER QUOTES SUB-TAB (Supplier: Eldoret Hardware)
-- =====================================================================
-- Run this in Supabase SQL Editor with sufficient privileges (e.g. service role).
-- Removes every quote (purchase order) where the supplier is Eldoret Hardware,
-- so the Quotes sub-tab under Orders & Quotes Management is cleared.
-- The supplier account is NOT deleted.
-- =====================================================================

DO $$
DECLARE
  v_supplier_id UUID;
  v_supplier_user_id UUID;
  v_po_ids UUID[];
  v_deleted_osh INT;
  v_deleted_mi INT;
  v_deleted_dr INT;
  v_updated_inv INT;
  v_deleted_dn INT;
  v_deleted_grn INT;
  v_deleted_po INT;
BEGIN
  -- Resolve supplier by company name (Eldoret Hardware)
  SELECT id, user_id INTO v_supplier_id, v_supplier_user_id
  FROM suppliers
  WHERE LOWER(TRIM(company_name)) = 'eldoret hardware'
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE NOTICE 'No supplier found with company_name "Eldoret Hardware". Check company_name in suppliers table.';
    RETURN;
  END IF;

  -- All purchase_orders for this supplier (supplier_id can be suppliers.id or user_id in app)
  v_po_ids := ARRAY(
    SELECT id FROM purchase_orders
    WHERE supplier_id = v_supplier_id
       OR supplier_id = v_supplier_user_id
  );

  IF array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No quotes/orders found for Eldoret Hardware. Nothing to delete.';
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

  -- 6. purchase_orders (the quotes)
  DELETE FROM purchase_orders WHERE id = ANY(v_po_ids);
  GET DIAGNOSTICS v_deleted_po = ROW_COUNT;

  RAISE NOTICE 'Deleted all quotes for Eldoret Hardware: % order_status_history, % material_items, % delivery_requests, % delivery_notes, % goods_received_notes, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_dn, v_deleted_grn, v_deleted_po, v_updated_inv;
END $$;
