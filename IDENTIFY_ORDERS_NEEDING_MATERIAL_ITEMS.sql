-- ===================================================================
-- IDENTIFY: Orders that still need material_items to appear on supplier dashboard
-- ===================================================================
-- 
-- These orders are assigned to delivery providers but can't appear on 
-- supplier dashboard because they have no material_items.
-- 
-- material_items are typically created when:
-- 1. Supplier generates QR codes for the order
-- 2. Order is processed and materials are catalogued
-- 
-- These orders may need manual intervention to create material_items.
-- ===================================================================

-- Step 1: List orders with no material_items but assigned to delivery providers
SELECT 
  'Orders Needing material_items' as check_type,
  po.id as purchase_order_id,
  po.po_number,
  po.supplier_id,
  po.status as po_status,
  po.delivery_status,
  po.created_at as po_created_at,
  dr.id as delivery_request_id,
  dr.status as delivery_request_status,
  dr.provider_id as delivery_provider_id,
  dr.created_at as delivery_request_created_at,
  CASE 
    WHEN dr.created_at < po.created_at THEN '⚠️ delivery_request created BEFORE purchase_order (unusual)'
    WHEN dr.created_at > po.created_at THEN '✅ delivery_request created AFTER purchase_order (normal)'
    ELSE '⚠️ Same timestamp'
  END as timing_analysis,
  CASE 
    WHEN po.status IN ('quote_created', 'quote_received_by_supplier', 'quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quote_accepted', 'quote_rejected', 'pending', 'quoted', 'rejected', 'confirmed') 
    THEN '✅ Order is in a valid status for material_items creation'
    ELSE '⚠️ Order status may prevent material_items creation'
  END as status_analysis
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND po.po_number IS NOT NULL 
  AND po.po_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM material_items mi 
    WHERE mi.purchase_order_id = po.id
  )
ORDER BY po.created_at DESC;

-- Step 2: Check if these orders have any related data that could help create material_items
SELECT 
  'Order Details for material_items Creation' as check_type,
  po.id as purchase_order_id,
  po.po_number,
  po.supplier_id,
  po.builder_id,
  po.status,
  po.delivery_status,
  po.total_amount,
  po.items,
  CASE 
    WHEN po.items IS NOT NULL AND jsonb_typeof(po.items) = 'array' AND jsonb_array_length(po.items) > 0 THEN '✅ Has items (JSONB array) - can create material_items from this'
    WHEN po.items IS NOT NULL AND jsonb_typeof(po.items) = 'object' THEN '✅ Has items (JSONB object) - can create material_items from this'
    ELSE '⚠️ No items data or empty'
  END as items_status,
  po.created_at,
  dr.id as delivery_request_id,
  dr.material_type as delivery_request_material_type,
  dr.quantity as delivery_request_quantity,
  dr.item_description,
  CASE 
    WHEN (po.items IS NOT NULL AND (
      (jsonb_typeof(po.items) = 'array' AND jsonb_array_length(po.items) > 0) OR
      jsonb_typeof(po.items) = 'object'
    )) THEN '✅ Has items data - can create material_items from this'
    WHEN dr.item_description IS NOT NULL THEN '✅ Has item_description in delivery_request - can use as reference'
    WHEN dr.material_type IS NOT NULL THEN '✅ Has material_type in delivery_request - can use as reference'
    ELSE '⚠️ No item details available - manual intervention needed'
  END as can_create_material_items
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND po.po_number IS NOT NULL 
  AND po.po_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM material_items mi 
    WHERE mi.purchase_order_id = po.id
  )
ORDER BY po.created_at DESC;

-- Step 3: Summary of what needs to be done
SELECT 
  'Action Required Summary' as check_type,
  COUNT(*) as total_orders_needing_material_items,
  COUNT(*) FILTER (
    WHERE po.items IS NOT NULL AND (
      (jsonb_typeof(po.items) = 'array' AND jsonb_array_length(po.items) > 0) OR
      jsonb_typeof(po.items) = 'object'
    )
  ) as orders_with_items_data,
  COUNT(*) FILTER (WHERE dr.item_description IS NOT NULL) as orders_with_delivery_request_description,
  COUNT(*) FILTER (WHERE dr.material_type IS NOT NULL) as orders_with_delivery_request_material_type,
  COUNT(*) FILTER (
    WHERE (po.items IS NOT NULL AND (
      (jsonb_typeof(po.items) = 'array' AND jsonb_array_length(po.items) > 0) OR
      jsonb_typeof(po.items) = 'object'
    ))
       OR dr.item_description IS NOT NULL
       OR dr.material_type IS NOT NULL
  ) as orders_with_available_data_for_creation,
  COUNT(*) FILTER (
    WHERE (po.items IS NULL OR (
      (jsonb_typeof(po.items) = 'array' AND jsonb_array_length(po.items) = 0) OR
      jsonb_typeof(po.items) = 'null'
    ))
      AND dr.item_description IS NULL
      AND dr.material_type IS NULL
  ) as orders_needing_manual_creation
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
  AND po.po_number IS NOT NULL 
  AND po.po_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM material_items mi 
    WHERE mi.purchase_order_id = po.id
  );
