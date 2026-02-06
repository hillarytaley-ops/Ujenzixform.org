-- DEBUG: Check supplier IDs and quote assignments for mamaethan@gmail.com
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Find the supplier record for mamaethan@gmail.com
SELECT 
  'SUPPLIER RECORD' as check_type,
  s.id as supplier_id,
  s.user_id as supplier_user_id,
  s.email as supplier_email,
  s.company_name,
  u.id as auth_user_id,
  u.email as auth_email,
  CASE WHEN s.user_id = u.id THEN '✓ MATCH' ELSE '✗ MISMATCH' END as user_id_status
FROM suppliers s
LEFT JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
WHERE LOWER(s.email) = 'mamaethan@gmail.com'
   OR LOWER(u.email) = 'mamaethan@gmail.com';

-- Step 2: Find all purchase orders where supplier_id might be this supplier
SELECT 
  'PURCHASE ORDERS FOR SUPPLIER' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  po.buyer_id,
  po.status,
  po.total_amount,
  po.created_at,
  s.company_name as supplier_name
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id OR po.supplier_id = s.user_id
WHERE s.email = 'mamaethan@gmail.com'
   OR po.supplier_id IN (
     SELECT id FROM suppliers WHERE email = 'mamaethan@gmail.com'
     UNION
     SELECT user_id FROM suppliers WHERE email = 'mamaethan@gmail.com'
     UNION
     SELECT id FROM auth.users WHERE email = 'mamaethan@gmail.com'
   )
ORDER BY po.created_at DESC
LIMIT 20;

-- Step 3: Check recent pending purchase orders to see where they're going
SELECT 
  'RECENT PENDING ORDERS' as check_type,
  po.id,
  po.po_number,
  po.supplier_id,
  po.status,
  po.created_at,
  s.company_name as assigned_supplier,
  s.email as supplier_email
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
WHERE po.status IN ('pending', 'quoted')
ORDER BY po.created_at DESC
LIMIT 10;

-- Step 4: Fix - Update supplier user_id to match auth.users.id
-- UNCOMMENT AND RUN THIS TO FIX:
/*
UPDATE suppliers s
SET user_id = u.id
FROM auth.users u
WHERE LOWER(s.email) = LOWER(u.email)
  AND LOWER(s.email) = 'mamaethan@gmail.com'
  AND s.user_id != u.id;
*/
