-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This creates the diagnostic function if it doesn't exist
-- ============================================================

-- Drop if exists (to avoid conflicts)
DROP FUNCTION IF EXISTS public.diagnose_qr_code(TEXT);

-- Create diagnostic function
CREATE OR REPLACE FUNCTION public.diagnose_qr_code(_scanned_qr TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  po_number_match TEXT;
  item_number_match TEXT;
  unit_number_match TEXT;
  exact_match RECORD;
BEGIN
  -- Extract components from scanned QR code
  -- Format: UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021
  po_number_match := (regexp_match(_scanned_qr, 'PO-(\d{13,})'))[1];
  item_number_match := (regexp_match(_scanned_qr, 'ITEM(\d+)'))[1];
  unit_number_match := (regexp_match(_scanned_qr, 'UNIT(\d+)'))[1];
  
  -- Try exact match
  SELECT * INTO exact_match
  FROM material_items
  WHERE qr_code = _scanned_qr
  LIMIT 1;
  
  result := jsonb_build_object(
    'scanned_qr', _scanned_qr,
    'extracted_po_number', po_number_match,
    'extracted_item_number', item_number_match,
    'extracted_unit_number', unit_number_match,
    'exact_match_found', (exact_match.id IS NOT NULL),
    'exact_match_qr_code', COALESCE(exact_match.qr_code::TEXT, 'NOT FOUND'),
    'exact_match_id', COALESCE(exact_match.id::TEXT, 'NOT FOUND')
  );
  
  -- If PO number found, query purchase orders
  IF po_number_match IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', po.id::TEXT,
        'po_number', po.po_number,
        'status', po.status
      )
    ), '[]'::JSONB) INTO result['po_matches']
    FROM purchase_orders po
    WHERE po.po_number LIKE '%' || po_number_match || '%'
    LIMIT 10;
  ELSE
    result['po_matches'] := '[]'::JSONB;
  END IF;
  
  -- If PO and item number found, query material items
  IF po_number_match IS NOT NULL AND item_number_match IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mi.id::TEXT,
        'qr_code', mi.qr_code,
        'item_sequence', mi.item_sequence,
        'purchase_order_id', mi.purchase_order_id::TEXT,
        'receive_scanned', COALESCE(mi.receive_scanned, false),
        'dispatch_scanned', COALESCE(mi.dispatch_scanned, false)
      )
    ), '[]'::JSONB) INTO result['item_matches']
    FROM material_items mi
    JOIN purchase_orders po ON po.id = mi.purchase_order_id
    WHERE po.po_number LIKE '%' || po_number_match || '%'
      AND mi.item_sequence = (item_number_match::INTEGER)
    LIMIT 10;
  ELSE
    result['item_matches'] := '[]'::JSONB;
  END IF;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.diagnose_qr_code(TEXT) TO authenticated;

-- Test it (uncomment to test)
-- SELECT public.diagnose_qr_code('UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021');
