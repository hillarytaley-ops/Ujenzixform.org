-- ============================================================
-- RUN ONCE: Force PO-1772598054688-GR03X (and any similar PO) to Delivered
-- Use when migrations/trigger keep failing and "no change at all".
-- Run this entire script in Supabase SQL Editor.
-- ============================================================

-- 1. Disable the trigger so we don't hit delivery_notes errors
ALTER TABLE purchase_orders DISABLE TRIGGER trigger_auto_create_dn;

-- 2. Mark all material_items for this PO as received
UPDATE material_items
SET receive_scanned = TRUE,
    receive_scanned_at = COALESCE(receive_scanned_at, NOW()),
    status = COALESCE(NULLIF(TRIM(status), ''), 'received'),
    updated_at = NOW()
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders
  WHERE po_number = 'PO-1772598054688-GR03X'
     OR po_number LIKE 'PO-1772598054688-GR03X%'
);

-- 3. Mark purchase_order as delivered
UPDATE purchase_orders
SET status = 'delivered',
    order_status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW()),
    updated_at = NOW()
WHERE po_number = 'PO-1772598054688-GR03X'
   OR po_number LIKE 'PO-1772598054688-GR03X%';

-- 4. Mark linked delivery_requests as delivered
UPDATE delivery_requests
SET status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW()),
    updated_at = NOW()
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders
  WHERE po_number = 'PO-1772598054688-GR03X'
     OR po_number LIKE 'PO-1772598054688-GR03X%'
)
AND status NOT IN ('delivered', 'completed', 'cancelled');

-- 5. Re-enable the trigger for future deliveries
ALTER TABLE purchase_orders ENABLE TRIGGER trigger_auto_create_dn;

-- Show what changed
SELECT 'material_items' AS table_name, COUNT(*) AS rows_updated
FROM material_items
WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-1772598054688%')
  AND receive_scanned = TRUE
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders WHERE po_number LIKE 'PO-1772598054688%' AND status = 'delivered'
UNION ALL
SELECT 'delivery_requests', COUNT(*) FROM delivery_requests dr
JOIN purchase_orders po ON po.id = dr.purchase_order_id
WHERE po.po_number LIKE 'PO-1772598054688%' AND dr.status = 'delivered';
