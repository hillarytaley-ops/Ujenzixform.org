-- ============================================================
-- IN TRANSIT DIAGNOSTIC - Run in Supabase SQL Editor
-- Identifies why provider sees no In Transit orders
-- ============================================================

-- 1. Provider lookup (taleyk) - adjust email if different
SELECT 
  '1. PROVIDER' AS step,
  dp.id AS provider_id,
  dp.email,
  dp.user_id,
  u.email AS auth_email
FROM delivery_providers dp
LEFT JOIN auth.users u ON u.id = dp.user_id
WHERE LOWER(TRIM(COALESCE(dp.email, u.email))) LIKE '%taleyk%';

-- 2. The 2 dispatched POs - current provider links
SELECT 
  '2. PURCHASE_ORDERS' AS step,
  po.id,
  po.po_number,
  po.status,
  po.delivery_provider_id,
  (SELECT email FROM delivery_providers WHERE id = po.delivery_provider_id) AS assigned_provider_email
FROM purchase_orders po
WHERE po.po_number IN ('PO-1772598054688-GR03X', 'PO-1772597930676-IATLA');

-- 3. delivery_requests for those POs
SELECT 
  '3. DELIVERY_REQUESTS' AS step,
  dr.id,
  dr.purchase_order_id,
  dr.status,
  dr.provider_id,
  (SELECT email FROM delivery_providers WHERE id = dr.provider_id) AS assigned_provider_email
FROM delivery_requests dr
WHERE dr.purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE po_number IN ('PO-1772598054688-GR03X', 'PO-1772597930676-IATLA')
);

-- 4. material_items dispatch_scanned status (what makes supplier "Dispatched" = provider "In Transit")
SELECT 
  '4. MATERIAL_ITEMS' AS step,
  po.po_number,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched_count,
  COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received_count
FROM material_items mi
JOIN purchase_orders po ON po.id = mi.purchase_order_id
WHERE po.po_number IN ('PO-1772598054688-GR03X', 'PO-1772597930676-IATLA')
GROUP BY po.po_number;
