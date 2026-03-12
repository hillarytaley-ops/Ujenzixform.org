-- ===================================================================
-- FIX: Ensure order QR-1773125455597-K3447 appears on supplier dashboard
-- ===================================================================

-- The supplier dashboard (EnhancedQRCodeManager) shows orders based on:
-- 1. material_items with matching supplier_id
-- 2. Valid po_number (orders without it are filtered out)
-- 3. Scan status (awaiting_dispatch, dispatched, in_transit, delivered)

-- Step 1: Find the purchase_order and check material_items
DO $$
DECLARE
  v_po_id UUID;
  v_supplier_id UUID;
  v_material_items_count INTEGER;
  v_items_with_supplier_id INTEGER;
BEGIN
  -- Find purchase_order
  SELECT id, supplier_id INTO v_po_id, v_supplier_id
  FROM purchase_orders
  WHERE po_number = 'QR-1773125455597-K3447'
     OR po_number LIKE '%1773125455597%'
  LIMIT 1;
  
  IF v_po_id IS NULL THEN
    RAISE NOTICE '❌ Purchase order not found for QR-1773125455597-K3447';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found purchase_order: % (supplier_id: %)', v_po_id, v_supplier_id;
  
  -- Count material_items
  SELECT COUNT(*) INTO v_material_items_count
  FROM material_items
  WHERE purchase_order_id = v_po_id;
  
  RAISE NOTICE 'Total material_items for this order: %', v_material_items_count;
  
  -- Count items with matching supplier_id
  SELECT COUNT(*) INTO v_items_with_supplier_id
  FROM material_items
  WHERE purchase_order_id = v_po_id
    AND supplier_id = v_supplier_id;
  
  RAISE NOTICE 'Items with matching supplier_id: %', v_items_with_supplier_id;
  
  -- Fix: Update material_items supplier_id if it doesn't match
  IF v_material_items_count > 0 AND v_items_with_supplier_id < v_material_items_count THEN
    UPDATE material_items
    SET supplier_id = v_supplier_id,
        updated_at = NOW()
    WHERE purchase_order_id = v_po_id
      AND (supplier_id IS NULL OR supplier_id != v_supplier_id);
    
    GET DIAGNOSTICS v_items_with_supplier_id = ROW_COUNT;
    RAISE NOTICE '✅ Updated % material_items to have correct supplier_id', v_items_with_supplier_id;
  ELSIF v_material_items_count = 0 THEN
    RAISE NOTICE '⚠️ No material_items found for this order - order cannot appear on supplier dashboard';
    RAISE NOTICE '   Supplier dashboard requires material_items to display orders';
  END IF;
  
  -- Verify trigger updated purchase_orders correctly
  UPDATE purchase_orders
  SET 
    delivery_provider_id = COALESCE(
      delivery_provider_id,
      (SELECT provider_id FROM delivery_requests WHERE purchase_order_id = v_po_id AND status = 'accepted' LIMIT 1)
    ),
    delivery_status = COALESCE(
      delivery_status,
      CASE 
        WHEN EXISTS (SELECT 1 FROM delivery_requests WHERE purchase_order_id = v_po_id AND status = 'accepted') 
        THEN 'accepted'
        ELSE delivery_status
      END
    ),
    updated_at = NOW()
  WHERE id = v_po_id
    AND (
      delivery_provider_id IS NULL 
      OR delivery_status IS NULL
    );
  
  GET DIAGNOSTICS v_items_with_supplier_id = ROW_COUNT;
  IF v_items_with_supplier_id > 0 THEN
    RAISE NOTICE '✅ Updated purchase_order delivery_provider_id and delivery_status';
  END IF;
  
  RAISE NOTICE '✅ Fix complete! Order should now appear on supplier dashboard.';
  
END $$;

-- Verification: Check if order will now appear
SELECT 
  'Verification' as check_type,
  po.po_number,
  po.supplier_id,
  COUNT(mi.id) as total_material_items,
  COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) as items_with_matching_supplier_id,
  COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) as items_awaiting_dispatch,
  CASE 
    WHEN po.po_number IS NULL OR po.po_number = '' THEN '❌ Missing po_number'
    WHEN COUNT(mi.id) = 0 THEN '❌ No material_items'
    WHEN COUNT(*) FILTER (WHERE mi.supplier_id = po.supplier_id) = 0 THEN '❌ No items with matching supplier_id'
    WHEN COUNT(*) FILTER (WHERE mi.dispatch_scanned = FALSE) > 0 THEN '✅ WILL APPEAR IN AWAITING DISPATCH'
    ELSE '✅ WILL APPEAR IN OTHER TAB'
  END as status
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.po_number = 'QR-1773125455597-K3447'
   OR po.po_number LIKE '%1773125455597%'
GROUP BY po.id, po.po_number, po.supplier_id;
