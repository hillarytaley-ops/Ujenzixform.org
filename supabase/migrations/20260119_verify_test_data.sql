-- =====================================================================
-- VERIFY TEST DATA - Run this to check what data exists
-- =====================================================================

-- 1. Check which users exist
SELECT id, email FROM auth.users 
WHERE email ILIKE '%taley%' OR email ILIKE '%mama%' OR email ILIKE '%kosgei%' OR email ILIKE '%hillary%'
ORDER BY email;

-- 2. Check purchase orders and who they belong to
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.total_amount,
    buyer.email as buyer_email,
    supplier.email as supplier_email,
    po.qr_code_generated,
    po.created_at
FROM purchase_orders po
LEFT JOIN auth.users buyer ON po.buyer_id = buyer.id
LEFT JOIN auth.users supplier ON po.supplier_id = supplier.id
WHERE po.po_number LIKE 'PO-TEST-%'
ORDER BY po.created_at DESC;

-- 3. Check material items (QR codes)
SELECT 
    mi.id,
    mi.qr_code,
    mi.material_type,
    mi.status,
    mi.quantity,
    mi.unit,
    po.po_number,
    buyer.email as buyer_email
FROM material_items mi
JOIN purchase_orders po ON mi.purchase_order_id = po.id
LEFT JOIN auth.users buyer ON po.buyer_id = buyer.id
WHERE mi.qr_code LIKE 'UJP-%'
ORDER BY mi.created_at DESC;

-- 4. Summary counts
SELECT 
    'Purchase Orders' as type,
    COUNT(*) as count
FROM purchase_orders 
WHERE po_number LIKE 'PO-TEST-%'
UNION ALL
SELECT 
    'Material Items (QR Codes)' as type,
    COUNT(*) as count
FROM material_items 
WHERE qr_code LIKE 'UJP-%';

