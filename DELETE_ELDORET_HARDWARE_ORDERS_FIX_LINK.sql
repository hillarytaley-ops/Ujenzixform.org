-- =====================================================================
-- DELETE ALL ORDERS/QUOTES FOR ELDORET HARDWARE (FIX "NOT LINKED")
-- =====================================================================
-- Use this if the original script found 0 rows because supplier_id on
-- purchase_orders doesn't match suppliers.id/user_id. This script tries
-- every link the dashboard uses: suppliers.id, suppliers.user_id,
-- profiles.id, profiles.user_id (company_name or full_name like Eldoret Hardware).
-- Run in Supabase SQL Editor with sufficient privileges (e.g. service role).
-- =====================================================================

DO $$
DECLARE
  v_po_ids UUID[];
  v_all_supplier_ids UUID[] := '{}';
  v_id UUID;
  v_deleted_osh INT;
  v_deleted_mi INT;
  v_deleted_dr INT;
  v_updated_inv INT;
  v_deleted_dn INT;
  v_deleted_grn INT;
  v_deleted_po INT;
BEGIN
  -- Collect ALL possible "Eldoret Hardware" IDs (suppliers + profiles)
  -- 1) suppliers.id and suppliers.user_id where company_name matches
  FOR v_id IN
    SELECT id FROM suppliers
    WHERE (LOWER(TRIM(company_name)) LIKE '%eldoret%' AND LOWER(company_name) LIKE '%hardware%')
    UNION
    SELECT user_id FROM suppliers
    WHERE user_id IS NOT NULL
      AND (LOWER(TRIM(company_name)) LIKE '%eldoret%' AND LOWER(company_name) LIKE '%hardware%')
  LOOP
    v_all_supplier_ids := array_append(v_all_supplier_ids, v_id);
  END LOOP;

  -- 2) profiles.id and profiles.user_id where company_name or full_name matches
  FOR v_id IN
    SELECT id FROM profiles
    WHERE (company_name IS NOT NULL AND LOWER(company_name) LIKE '%eldoret%' AND LOWER(company_name) LIKE '%hardware%')
       OR (full_name IS NOT NULL AND LOWER(full_name) LIKE '%eldoret%' AND LOWER(full_name) LIKE '%hardware%')
    UNION
    SELECT user_id FROM profiles
    WHERE user_id IS NOT NULL
      AND ((company_name IS NOT NULL AND LOWER(company_name) LIKE '%eldoret%' AND LOWER(company_name) LIKE '%hardware%')
           OR (full_name IS NOT NULL AND LOWER(full_name) LIKE '%eldoret%' AND LOWER(full_name) LIKE '%hardware%'))
  LOOP
    IF v_id IS NOT NULL AND NOT (v_id = ANY(v_all_supplier_ids)) THEN
      v_all_supplier_ids := array_append(v_all_supplier_ids, v_id);
    END IF;
  END LOOP;

  IF array_length(v_all_supplier_ids, 1) IS NULL OR array_length(v_all_supplier_ids, 1) = 0 THEN
    RAISE NOTICE 'No supplier or profile found matching "Eldoret Hardware". Run DIAGNOSE_ELDORET_HARDWARE_LINK.sql first.';
    RETURN;
  END IF;

  -- All purchase_orders whose supplier_id is any of these IDs
  v_po_ids := ARRAY(
    SELECT id FROM purchase_orders
    WHERE supplier_id = ANY(v_all_supplier_ids)
  );

  IF array_length(v_po_ids, 1) IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'No purchase_orders found with supplier_id in (%). Run DIAGNOSE_ELDORET_HARDWARE_LINK.sql to see actual supplier_id values.', array_to_string(v_all_supplier_ids, ',');
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

  RAISE NOTICE 'Deleted Eldoret Hardware orders: % order_status_history, % material_items, % delivery_requests, % delivery_notes, % goods_received_notes, % purchase_orders. Unlinked % invoices.',
    v_deleted_osh, v_deleted_mi, v_deleted_dr, v_deleted_dn, v_deleted_grn, v_deleted_po, v_updated_inv;
END $$;
