-- ============================================================
-- RPC: Delete selected material_items (QR codes) and create fresh ones
-- Used from QR Codes Management when user selects items and clicks "Delete & Regenerate"
-- Created: April 23, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_and_regenerate_qr_codes(_item_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  old_qr_codes TEXT[] := ARRAY[]::TEXT[];
  new_qr_code TEXT;
  inserted_count INTEGER := 0;
  deleted_count INTEGER := 0;
  caller_id UUID;
  is_supplier BOOLEAN := FALSE;
  is_admin BOOLEAN := FALSE;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'error_code', 'UNAUTHORIZED');
  END IF;

  is_admin := public.has_role(caller_id, 'admin');
  is_supplier := EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = caller_id);

  IF NOT is_admin AND NOT is_supplier THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only supplier or admin can regenerate QR codes', 'error_code', 'FORBIDDEN');
  END IF;

  -- Create temp table to hold row data for re-insert after delete (avoids unique constraint on purchase_order_id+item_sequence)
  CREATE TEMP TABLE IF NOT EXISTS _regen_rows (
    purchase_order_id UUID, item_sequence INT, material_type TEXT, category TEXT,
    quantity NUMERIC, unit TEXT, supplier_id UUID, buyer_id UUID, buyer_name TEXT, buyer_email TEXT, buyer_phone TEXT,
    item_unit_price NUMERIC, item_total_price NUMERIC, item_description TEXT
  ) ON COMMIT DROP;

  -- Collect old qr_codes and copy row data; verify caller can act
  FOR r IN
    SELECT mi.id, mi.qr_code, mi.purchase_order_id, mi.item_sequence, mi.material_type, mi.category,
           mi.quantity, mi.unit, mi.supplier_id, mi.buyer_id, mi.buyer_name, mi.buyer_email, mi.buyer_phone,
           mi.item_unit_price, mi.item_total_price, mi.item_description
    FROM material_items mi
    WHERE mi.id = ANY(_item_ids)
  LOOP
    IF NOT is_admin AND r.supplier_id IS DISTINCT FROM (SELECT id FROM public.suppliers WHERE user_id = caller_id LIMIT 1) THEN
      DROP TABLE IF EXISTS _regen_rows;
      RETURN jsonb_build_object('success', false, 'error', 'You can only regenerate QR codes for your own items', 'error_code', 'FORBIDDEN');
    END IF;
    old_qr_codes := array_append(old_qr_codes, r.qr_code);
    INSERT INTO _regen_rows (purchase_order_id, item_sequence, material_type, category, quantity, unit, supplier_id,
      buyer_id, buyer_name, buyer_email, buyer_phone, item_unit_price, item_total_price, item_description)
    VALUES (r.purchase_order_id, r.item_sequence, r.material_type, r.category, COALESCE(r.quantity, 1), COALESCE(r.unit, 'units'), r.supplier_id,
      r.buyer_id, r.buyer_name, r.buyer_email, r.buyer_phone, r.item_unit_price, r.item_total_price, r.item_description);
  END LOOP;

  IF array_length(old_qr_codes, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No valid items found', 'error_code', 'NOT_FOUND');
  END IF;

  -- Null scan references, delete scan events, then delete old rows
  UPDATE material_items
  SET dispatch_scan_id = NULL, receiving_scan_id = NULL, verification_scan_id = NULL
  WHERE id = ANY(_item_ids);
  DELETE FROM qr_scan_events WHERE qr_code = ANY(old_qr_codes);
  DELETE FROM material_items WHERE id = ANY(_item_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Insert new rows with fresh qr_codes
  FOR r IN SELECT * FROM _regen_rows
  LOOP
    new_qr_code := 'UJP-' || UPPER(SPLIT_PART(COALESCE(r.category, 'GEN'), ' ', 1)) || '-REGEN-' ||
      REPLACE(gen_random_uuid()::TEXT, '-', '') || '-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    INSERT INTO material_items (
      purchase_order_id, qr_code, item_sequence, material_type, category,
      quantity, unit, supplier_id, status,
      buyer_id, buyer_name, buyer_email, buyer_phone,
      item_unit_price, item_total_price, item_description
    ) VALUES (
      r.purchase_order_id, new_qr_code, r.item_sequence, r.material_type, r.category,
      r.quantity, r.unit, r.supplier_id, 'pending',
      r.buyer_id, r.buyer_name, r.buyer_email, r.buyer_phone,
      r.item_unit_price, r.item_total_price, r.item_description
    );
    inserted_count := inserted_count + 1;
  END LOOP;

  DROP TABLE IF EXISTS _regen_rows;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'regenerated_count', inserted_count
  );
END;
$$;

COMMENT ON FUNCTION public.delete_and_regenerate_qr_codes(UUID[]) IS
  'Deletes selected material_items (by id), removes their qr_scan_events, and inserts new material_items with fresh qr_codes. Supplier or admin only.';

GRANT EXECUTE ON FUNCTION public.delete_and_regenerate_qr_codes(UUID[]) TO authenticated;
