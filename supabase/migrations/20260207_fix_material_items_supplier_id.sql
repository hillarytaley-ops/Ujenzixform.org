-- =====================================================================
-- FIX MATERIAL ITEMS SUPPLIER_ID TO MATCH SUPPLIERS TABLE
-- =====================================================================
-- The issue: material_items.supplier_id should match suppliers.id
-- But the QR generation function might be using the wrong ID
-- =====================================================================

-- Step 1: Check what supplier_id values are in recent material_items
SELECT DISTINCT 
    mi.supplier_id,
    s.id as suppliers_table_id,
    s.company_name,
    s.email,
    COUNT(*) as item_count
FROM material_items mi
LEFT JOIN suppliers s ON s.id = mi.supplier_id
WHERE mi.created_at > NOW() - INTERVAL '2 days'
GROUP BY mi.supplier_id, s.id, s.company_name, s.email
ORDER BY item_count DESC;

-- Step 2: Check Mama Ethan's supplier record
SELECT 
    id as supplier_id,
    user_id,
    company_name,
    email
FROM suppliers 
WHERE email = 'mamaethan@gmail.com' OR company_name ILIKE '%mama%ethan%';

-- Step 3: Check if there are material_items for Mama Ethan's supplier_id
SELECT COUNT(*) as mama_ethan_items
FROM material_items 
WHERE supplier_id = '91623c3b-d44b-46d4-9cf1-b662084d03da';

-- Step 4: Check what supplier_id the recent items have
SELECT 
    mi.id,
    mi.supplier_id,
    mi.material_type,
    mi.created_at,
    po.supplier_id as po_supplier_id,
    s.company_name
FROM material_items mi
JOIN purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN suppliers s ON s.id = mi.supplier_id
WHERE mi.created_at > NOW() - INTERVAL '1 day'
ORDER BY mi.created_at DESC
LIMIT 10;
