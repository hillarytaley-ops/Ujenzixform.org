-- Check who the suppliers are for the mismatched quote

-- Who is supplier 56c84b3c-972f-4db3-b8c4-ca54270fe80b?
SELECT 
  'SUPPLIER 56c84b3c' as check_type,
  id,
  user_id,
  email,
  company_name
FROM suppliers
WHERE id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b'
   OR user_id = '56c84b3c-972f-4db3-b8c4-ca54270fe80b';

-- Who is supplier 91623c3b-d44b-46d4-9cf1-b662084d03da (mamaethan)?
SELECT 
  'SUPPLIER 91623c3b (mamaethan)' as check_type,
  id,
  user_id,
  email,
  company_name
FROM suppliers
WHERE id = '91623c3b-d44b-46d4-9cf1-b662084d03da'
   OR user_id = '91623c3b-d44b-46d4-9cf1-b662084d03da';

-- Check all suppliers
SELECT 
  id,
  user_id,
  email,
  company_name
FROM suppliers
ORDER BY created_at DESC
LIMIT 10;
