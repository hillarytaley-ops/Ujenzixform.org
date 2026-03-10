-- ============================================================
-- COMPREHENSIVE FIX: In Transit orders missing from delivery schedule
-- This script diagnoses AND fixes the issue completely
-- ============================================================

-- STEP 1: DIAGNOSE - Check the two specific orders
SELECT 
  po.id,
  po.po_number,
  po.status as po_status,
  po.delivery_provider_id as po_delivery_provider_id,
  po.delivery_status,
  dr.id as delivery_request_id,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE) as received_items,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) = COUNT(mi.id) AND COUNT(mi.id) > 0 
    THEN 'ALL DISPATCHED - IN TRANSIT' 
    ELSE 'NOT ALL DISPATCHED' 
  END as status_check,
  CASE
    WHEN po.delivery_provider_id IS NULL THEN 'MISSING delivery_provider_id on purchase_order'
    WHEN dr.provider_id IS NULL THEN 'MISSING provider_id on delivery_request'
    WHEN po.delivery_provider_id != dr.provider_id THEN 'MISMATCH: po.delivery_provider_id != dr.provider_id'
    ELSE 'OK - IDs match'
  END as issue_diagnosis
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, po.delivery_status, 
         dr.id, dr.provider_id, dr.status;

-- STEP 2: FIX - Set delivery_provider_id from delivery_requests for ALL In Transit orders
UPDATE purchase_orders po
SET 
  delivery_provider_id = dr.provider_id,
  delivery_status = CASE 
    WHEN dr.status = 'accepted' THEN 'in_transit'
    WHEN dr.status IS NULL THEN 'dispatched'
    ELSE 'dispatched'
  END,
  updated_at = NOW()
FROM delivery_requests dr
WHERE dr.purchase_order_id = po.id
  AND dr.provider_id IS NOT NULL
  AND (
    po.delivery_provider_id IS NULL 
    OR po.delivery_provider_id != dr.provider_id
  )
  AND po.id IN (
    SELECT purchase_order_id
    FROM material_items
    GROUP BY purchase_order_id
    HAVING COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) = COUNT(*) 
      AND COUNT(*) > 0
      AND COUNT(*) FILTER (WHERE receive_scanned = TRUE) < COUNT(*)
  );

-- STEP 3: Also fix orders that might not have delivery_requests but should
-- (This handles edge cases where delivery_request was deleted or never created)
UPDATE purchase_orders po
SET 
  delivery_provider_id = (
    SELECT provider_id 
    FROM delivery_requests 
    WHERE purchase_order_id = po.id 
      AND provider_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE po.delivery_provider_id IS NULL
  AND EXISTS (
    SELECT 1 FROM delivery_requests 
    WHERE purchase_order_id = po.id 
      AND provider_id IS NOT NULL
  )
  AND po.id IN (
    SELECT purchase_order_id
    FROM material_items
    GROUP BY purchase_order_id
    HAVING COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) = COUNT(*) 
      AND COUNT(*) > 0
  );

-- STEP 4: VERIFY - Check if orders now have correct delivery_provider_id
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.delivery_provider_id,
  po.delivery_status,
  dr.provider_id as dr_provider_id,
  dr.status as dr_status,
  COUNT(mi.id) as total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = TRUE) as dispatched_items,
  CASE 
    WHEN po.delivery_provider_id IS NOT NULL AND po.delivery_provider_id = dr.provider_id 
    THEN '✅ FIXED - Should appear in schedule'
    WHEN po.delivery_provider_id IS NULL 
    THEN '❌ STILL MISSING delivery_provider_id'
    WHEN po.delivery_provider_id != dr.provider_id 
    THEN '❌ MISMATCH - IDs do not match'
    ELSE '⚠️ UNKNOWN STATE'
  END as fix_status
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE po.po_number IN ('PO-1772597930676-IATLA', 'QR-1772324057410-ROZCS')
GROUP BY po.id, po.po_number, po.status, po.delivery_provider_id, po.delivery_status, 
         dr.provider_id, dr.status;

-- STEP 5: Test the RPC function result for current user
-- Replace 'YOUR_USER_ID_HERE' with the actual delivery provider user ID
-- This will show what the RPC function returns for the current provider
SELECT 
  'Run this query to test RPC function:' as instruction,
  'SELECT * FROM get_deliveries_for_provider_unified();' as query_to_run,
  'Then check if orders with po_number IN (''PO-1772597930676-IATLA'', ''QR-1772324057410-ROZCS'') appear in the result' as what_to_check;
