-- =====================================================================
-- DIAGNOSE: Why Eldoret Hardware orders are "not linked"
-- =====================================================================
-- Run this in Supabase SQL Editor. It shows:
-- 1. supplier_id values on recent purchase_orders (what the dashboard sees)
-- 2. Eldoret Hardware supplier row(s) and their id / user_id
-- 3. Profiles that might be "Eldoret Hardware" (id, user_id)
-- Compare (1) with (2) and (3) to see which ID to use for deletion.
-- =====================================================================

-- 1. Recent purchase_orders and their supplier_id (these are what show on Overview/Quotes)
SELECT
  'purchase_orders (recent)' AS source,
  po.id,
  po.po_number,
  po.supplier_id,
  po.buyer_id,
  po.status,
  po.created_at::date
FROM purchase_orders po
ORDER BY po.created_at DESC
LIMIT 15;

-- 2. Supplier row(s) for "Eldoret Hardware" (exact and fuzzy match)
SELECT
  'suppliers (Eldoret Hardware)' AS source,
  s.id AS supplier_id,
  s.user_id AS supplier_user_id,
  s.company_name,
  s.email
FROM suppliers s
WHERE LOWER(TRIM(s.company_name)) = 'eldoret hardware'
   OR (LOWER(s.company_name) LIKE '%eldoret%' AND LOWER(s.company_name) LIKE '%hardware%');

-- 3. Profiles that might represent Eldoret Hardware (company_name or full_name)
SELECT
  'profiles (Eldoret Hardware)' AS source,
  p.id AS profile_id,
  p.user_id AS profile_user_id,
  p.full_name,
  p.company_name
FROM profiles p
WHERE (p.company_name IS NOT NULL AND (LOWER(p.company_name) LIKE '%eldoret%' AND LOWER(p.company_name) LIKE '%hardware%'))
   OR (p.full_name IS NOT NULL AND (LOWER(p.full_name) LIKE '%eldoret%' AND LOWER(p.full_name) LIKE '%hardware%'));

-- 4. Do any purchase_orders.supplier_id match the supplier or profile IDs above?
-- (Run after checking results from 1–3; this is a quick check.)
SELECT
  po.po_number,
  po.supplier_id,
  po.status,
  CASE
    WHEN s.id IS NOT NULL THEN 'matches suppliers.id'
    WHEN s2.user_id IS NOT NULL THEN 'matches suppliers.user_id'
    WHEN p.id IS NOT NULL THEN 'matches profiles.id'
    WHEN p2.user_id IS NOT NULL THEN 'matches profiles.user_id'
    ELSE 'NO MATCH – supplier_id not linked to Eldoret Hardware'
  END AS link_status
FROM purchase_orders po
LEFT JOIN suppliers s ON s.id = po.supplier_id AND (LOWER(TRIM(s.company_name)) LIKE '%eldoret%' AND LOWER(s.company_name) LIKE '%hardware%')
LEFT JOIN suppliers s2 ON s2.user_id = po.supplier_id AND (LOWER(TRIM(s2.company_name)) LIKE '%eldoret%' AND LOWER(s2.company_name) LIKE '%hardware%')
LEFT JOIN profiles p ON p.id = po.supplier_id AND (LOWER(COALESCE(p.company_name,'')) LIKE '%eldoret%' AND LOWER(COALESCE(p.company_name,'')) LIKE '%hardware%')
LEFT JOIN profiles p2 ON p2.user_id = po.supplier_id AND (LOWER(COALESCE(p2.company_name,'')) LIKE '%eldoret%' AND LOWER(COALESCE(p2.company_name,'')) LIKE '%hardware%')
ORDER BY po.created_at DESC
LIMIT 20;

-- =====================================================================
-- 5. If link_status above is "NO MATCH", copy the supplier_id value(s)
--    from section 1 and run the script below (replace YOUR_SUPPLIER_ID_HERE).
-- =====================================================================
-- DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- DELETE FROM material_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- DELETE FROM delivery_requests WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- UPDATE invoices SET purchase_order_id = NULL WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- DELETE FROM delivery_notes WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- DELETE FROM goods_received_notes WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE');
-- DELETE FROM purchase_orders WHERE supplier_id = 'YOUR_SUPPLIER_ID_HERE';
