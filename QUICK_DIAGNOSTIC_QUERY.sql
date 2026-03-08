-- ============================================================
-- QUICK DIAGNOSTIC - Run this directly without creating function
-- Paste your QR code in the WHERE clause
-- ============================================================

-- Extract components
WITH qr_analysis AS (
  SELECT 
    'UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021' AS scanned_qr,
    (regexp_match('UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021', 'PO-(\d{13,})'))[1] AS po_number,
    (regexp_match('UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021', 'ITEM(\d+)'))[1] AS item_number,
    (regexp_match('UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021', 'UNIT(\d+)'))[1] AS unit_number
)
SELECT 
  qa.scanned_qr,
  qa.po_number AS extracted_po,
  qa.item_number AS extracted_item,
  qa.unit_number AS extracted_unit,
  
  -- Check exact match
  (SELECT COUNT(*) FROM material_items WHERE qr_code = qa.scanned_qr) AS exact_match_count,
  (SELECT qr_code FROM material_items WHERE qr_code = qa.scanned_qr LIMIT 1) AS exact_match_qr,
  
  -- Check PO matches
  (SELECT COUNT(*) FROM purchase_orders WHERE po_number LIKE '%' || qa.po_number || '%') AS po_match_count,
  (SELECT jsonb_agg(jsonb_build_object('id', id::TEXT, 'po_number', po_number, 'status', status))
   FROM purchase_orders WHERE po_number LIKE '%' || qa.po_number || '%' LIMIT 5) AS po_matches,
  
  -- Check item matches by PO + item sequence
  (SELECT COUNT(*) 
   FROM material_items mi
   JOIN purchase_orders po ON po.id = mi.purchase_order_id
   WHERE po.po_number LIKE '%' || qa.po_number || '%'
     AND mi.item_sequence = (qa.item_number::INTEGER)) AS item_match_count,
  
  (SELECT jsonb_agg(jsonb_build_object(
    'id', mi.id::TEXT,
    'qr_code', mi.qr_code,
    'item_sequence', mi.item_sequence,
    'receive_scanned', COALESCE(mi.receive_scanned, false),
    'dispatch_scanned', COALESCE(mi.dispatch_scanned, false)
   ))
   FROM material_items mi
   JOIN purchase_orders po ON po.id = mi.purchase_order_id
   WHERE po.po_number LIKE '%' || qa.po_number || '%'
     AND mi.item_sequence = (qa.item_number::INTEGER)
   LIMIT 5) AS item_matches
FROM qr_analysis qa;
