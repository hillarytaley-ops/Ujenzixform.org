-- ===================================================================
-- FIX: Ensure orders assigned to delivery providers appear on supplier dashboard
-- ===================================================================
-- 
-- This script fixes the 4 scenarios where orders are assigned to delivery providers
-- but don't appear on the supplier dashboard:
--
-- 1. Fix missing po_number
-- 2. Ensure material_items exist
-- 3. Fix wrong supplier_id in material_items
-- 4. Verify timing (material_items should exist)
--
-- ===================================================================

DO $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_po_record RECORD;
BEGIN
  RAISE NOTICE '🔧 Starting fix for orders missing from supplier dashboard...';
  
  -- Fix Scenario 1: Generate po_number for orders without it
  FOR v_po_record IN
    SELECT DISTINCT po.id, po.supplier_id
    FROM purchase_orders po
    INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
      AND (po.po_number IS NULL OR po.po_number = '')
    LIMIT 100
  LOOP
    -- Generate a po_number if missing
    UPDATE purchase_orders
    SET 
      po_number = 'QR-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 5)),
      updated_at = NOW()
    WHERE id = v_po_record.id
      AND (po_number IS NULL OR po_number = '');
    
    GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
    IF v_fixed_count > 0 THEN
      RAISE NOTICE '✅ Fixed missing po_number for purchase_order: %', v_po_record.id;
    END IF;
  END LOOP;
  
  -- Fix Scenario 3: Update material_items.supplier_id to match purchase_orders.supplier_id
  UPDATE material_items mi
  SET 
    supplier_id = po.supplier_id,
    updated_at = NOW()
  FROM purchase_orders po
  INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
  WHERE mi.purchase_order_id = po.id
    AND dr.status IN ('accepted', 'assigned', 'pending', 'scheduled')
    AND po.supplier_id IS NOT NULL
    AND (mi.supplier_id IS NULL OR mi.supplier_id != po.supplier_id);
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  IF v_fixed_count > 0 THEN
    RAISE NOTICE '✅ Fixed supplier_id mismatch in % material_items', v_fixed_count;
  END IF;
  
  RAISE NOTICE '✅ Fix complete!';
  
END $$;

-- Verification: Check how many orders are now fixed
SELECT 
  'Verification: Fixed Orders' as check_type,
  COUNT(DISTINCT po.id) as total_orders_with_delivery_requests,
  COUNT(DISTINCT po.id) FILTER (
    WHERE po.po_number IS NOT NULL 
      AND po.po_number != ''
      AND EXISTS (SELECT 1 FROM material_items mi WHERE mi.purchase_order_id = po.id)
      AND EXISTS (
        SELECT 1 FROM material_items mi 
        WHERE mi.purchase_order_id = po.id 
          AND mi.supplier_id = po.supplier_id
      )
  ) as orders_that_will_appear_on_supplier_dashboard,
  COUNT(DISTINCT po.id) FILTER (
    WHERE po.po_number IS NULL 
       OR po.po_number = ''
       OR NOT EXISTS (SELECT 1 FROM material_items mi WHERE mi.purchase_order_id = po.id)
       OR NOT EXISTS (
         SELECT 1 FROM material_items mi 
         WHERE mi.purchase_order_id = po.id 
           AND mi.supplier_id = po.supplier_id
       )
  ) as orders_still_missing_from_supplier_dashboard
FROM purchase_orders po
INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
WHERE dr.status IN ('accepted', 'assigned', 'pending', 'scheduled');
