-- Find where ID 56c84b3c-972f-4db3-b8c4-ca54270fe80b exists

-- Check profiles table
SELECT 'PROFILES' as table_name, id, user_id, email, full_name
FROM profiles
WHERE id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b'
   OR user_id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b';

-- Check auth.users table
SELECT 'AUTH.USERS' as table_name, id, email
FROM auth.users
WHERE id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b';

-- Check suppliers table (already confirmed empty, but double check)
SELECT 'SUPPLIERS' as table_name, id, user_id, email, company_name
FROM suppliers
WHERE id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b'
   OR user_id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b';

-- Check supplier_product_prices - maybe this ID is stored there
SELECT 'SUPPLIER_PRODUCT_PRICES' as table_name, supplier_id, COUNT(*) as count
FROM supplier_product_prices
WHERE supplier_id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b'
GROUP BY supplier_id;
