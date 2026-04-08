-- Manual diagnostic: supplier ↔ purchase order linkage (replace placeholders before run).
-- Use a staging email or UUID from your own project — do not use real production PII in git.

-- Step 1: Supplier row vs auth.users
SELECT
    'SUPPLIER RECORD' AS check_type,
    s.id AS supplier_id,
    s.user_id AS supplier_user_id,
    s.email AS supplier_email,
    s.company_name,
    u.id AS auth_user_id,
    u.email AS auth_email,
    CASE WHEN s.user_id = u.id THEN 'MATCH' ELSE 'MISMATCH' END AS user_id_status
FROM suppliers s
LEFT JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
WHERE LOWER(COALESCE(s.email, '')) = LOWER('supplier@example.test')
   OR LOWER(COALESCE(u.email, '')) = LOWER('supplier@example.test');

-- Step 2: Purchase orders tied to that supplier
SELECT
    'PURCHASE ORDERS FOR SUPPLIER' AS check_type,
    po.id,
    po.po_number,
    po.supplier_id,
    po.buyer_id,
    po.status,
    po.total_amount,
    po.created_at,
    s.company_name AS supplier_name
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id OR po.supplier_id = s.user_id
WHERE s.email = 'supplier@example.test'
   OR po.supplier_id IN (
     SELECT id FROM suppliers WHERE email = 'supplier@example.test'
     UNION
     SELECT user_id FROM suppliers WHERE email = 'supplier@example.test'
     UNION
     SELECT id FROM auth.users WHERE email = 'supplier@example.test'
   )
ORDER BY po.created_at DESC
LIMIT 20;

-- Step 3: Recent pending / quoted orders
SELECT
    'RECENT PENDING ORDERS' AS check_type,
    po.id,
    po.po_number,
    po.supplier_id,
    po.status,
    po.created_at,
    s.company_name AS assigned_supplier,
    s.email AS supplier_email
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
WHERE po.status IN ('pending', 'quoted')
ORDER BY po.created_at DESC
LIMIT 10;

/*
-- Step 4: Fix user_id mismatch (run only after verification)
UPDATE suppliers s
SET user_id = u.id
FROM auth.users u
WHERE LOWER(s.email) = LOWER(u.email)
  AND LOWER(s.email) = LOWER('supplier@example.test')
  AND s.user_id IS DISTINCT FROM u.id;
*/
