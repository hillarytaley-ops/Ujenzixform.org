-- ============================================================
-- CHECK FOR DUPLICATES IN DATABASE
-- Run this to see what duplicates exist
-- ============================================================

-- Check for duplicate delivery_requests by purchase_order_id
SELECT 
    purchase_order_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as delivery_request_ids,
    array_agg(status ORDER BY created_at DESC) as statuses,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM delivery_requests
WHERE purchase_order_id IS NOT NULL
  AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
GROUP BY purchase_order_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Check for duplicate delivery_requests by address + material (NULL purchase_order_id)
SELECT 
    builder_id,
    LOWER(TRIM(delivery_address)) as delivery_address_normalized,
    LOWER(TRIM(material_type)) as material_type_normalized,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as delivery_request_ids,
    array_agg(status ORDER BY created_at DESC) as statuses
FROM delivery_requests
WHERE purchase_order_id IS NULL
  AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
  AND builder_id IS NOT NULL
  AND delivery_address IS NOT NULL
  AND material_type IS NOT NULL
GROUP BY builder_id, LOWER(TRIM(delivery_address)), LOWER(TRIM(material_type))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Check for delivery_requests with same delivery_address but different purchase_order_ids
-- (This might indicate the same delivery was created multiple times)
SELECT 
    LOWER(TRIM(delivery_address)) as delivery_address_normalized,
    LOWER(TRIM(material_type)) as material_type_normalized,
    COUNT(DISTINCT purchase_order_id) as unique_po_count,
    COUNT(*) as total_delivery_requests,
    array_agg(DISTINCT purchase_order_id) as purchase_order_ids,
    array_agg(id) as delivery_request_ids
FROM delivery_requests
WHERE delivery_address IS NOT NULL
  AND material_type IS NOT NULL
  AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
GROUP BY LOWER(TRIM(delivery_address)), LOWER(TRIM(material_type))
HAVING COUNT(DISTINCT purchase_order_id) > 1 OR COUNT(*) > 1
ORDER BY total_delivery_requests DESC
LIMIT 20;
