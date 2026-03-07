-- ============================================================
-- FORCE LINK DELIVERED ORDERS TO DELIVERY PROVIDER
-- ============================================================
-- Issue: 3 delivered orders from supplier dashboard are not appearing
-- on the delivery provider dashboard, even though they were delivered.
--
-- Orders:
-- 1. PO-1772295614017-4U6J2
-- 2. QR-1772673713715-XJ0LD
-- 3. QR-1772340447370-W10OJ
--
-- Solution: Directly update delivery_requests and purchase_orders
-- to ensure they are properly linked to the delivery provider
-- and marked as delivered.
-- ============================================================

-- Step 1: Find the delivery provider for these orders
-- We'll update delivery_requests to ensure they have the correct provider_id
-- and status = 'delivered'

DO $$
DECLARE
  v_order_numbers TEXT[] := ARRAY['1772295614017', '1772673713715', '1772340447370'];
  v_order_number TEXT;
  v_po_record RECORD;
  v_dr_record RECORD;
  v_provider_id UUID;
  v_total_items INTEGER;
  v_received_items INTEGER;
BEGIN
  -- Loop through each order number
  FOREACH v_order_number IN ARRAY v_order_numbers
  LOOP
    RAISE NOTICE 'Processing order: %', v_order_number;
    
    -- Find the purchase_order by po_number
    SELECT id, delivery_provider_id, status, po_number
    INTO v_po_record
    FROM purchase_orders
    WHERE po_number LIKE '%' || v_order_number || '%'
    LIMIT 1;
    
    IF v_po_record.id IS NOT NULL THEN
      RAISE NOTICE 'Found purchase_order: % (status: %, delivery_provider_id: %)', 
        v_po_record.id, v_po_record.status, v_po_record.delivery_provider_id;
      
      -- Get the provider_id from purchase_order or delivery_requests
      v_provider_id := v_po_record.delivery_provider_id;
      
      -- If no provider_id on PO, try to get it from delivery_requests
      IF v_provider_id IS NULL THEN
        SELECT provider_id
        INTO v_provider_id
        FROM delivery_requests
        WHERE purchase_order_id = v_po_record.id
        LIMIT 1;
      END IF;
      
      -- If still no provider_id, try to find any delivery_provider
      -- (This is a fallback - ideally the provider should be set)
      IF v_provider_id IS NULL THEN
        SELECT id
        INTO v_provider_id
        FROM delivery_providers
        WHERE id IN (
          SELECT DISTINCT provider_id
          FROM delivery_requests
          WHERE purchase_order_id = v_po_record.id
        )
        LIMIT 1;
      END IF;
      
      RAISE NOTICE 'Using provider_id: %', v_provider_id;
      
      -- Update purchase_order to ensure status is 'delivered' and has provider_id
      UPDATE purchase_orders
      SET 
        status = 'delivered',
        delivery_provider_id = COALESCE(delivery_provider_id, v_provider_id),
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
      WHERE id = v_po_record.id
        AND (status != 'delivered' OR delivery_provider_id IS NULL);
      
      RAISE NOTICE 'Updated purchase_order %', v_po_record.id;
      
      -- Update or create delivery_request to ensure it's linked and marked as delivered
      SELECT id, provider_id, status
      INTO v_dr_record
      FROM delivery_requests
      WHERE purchase_order_id = v_po_record.id
      LIMIT 1;
      
      IF v_dr_record.id IS NOT NULL THEN
        -- Update existing delivery_request
        UPDATE delivery_requests
        SET 
          status = 'delivered',
          provider_id = COALESCE(provider_id, v_provider_id),
          delivered_at = COALESCE(delivered_at, NOW()),
          updated_at = NOW()
        WHERE id = v_dr_record.id
          AND (status != 'delivered' OR provider_id IS NULL);
        
        RAISE NOTICE 'Updated delivery_request %', v_dr_record.id;
      ELSE
        -- Create delivery_request if it doesn't exist (shouldn't happen, but just in case)
        IF v_provider_id IS NOT NULL THEN
          INSERT INTO delivery_requests (
            purchase_order_id,
            provider_id,
            status,
            delivery_location,
            delivery_address,
            delivered_at,
            created_at,
            updated_at
          )
          SELECT 
            v_po_record.id,
            v_provider_id,
            'delivered',
            COALESCE(po.delivery_address, 'Delivery location'),
            COALESCE(po.delivery_address, 'Delivery location'),
            NOW(),
            NOW(),
            NOW()
          FROM purchase_orders po
          WHERE po.id = v_po_record.id
          ON CONFLICT DO NOTHING;
          
          RAISE NOTICE 'Created delivery_request for purchase_order %', v_po_record.id;
        END IF;
      END IF;
      
      -- Verify all material_items are receive_scanned = true
      -- (This is what makes an order "delivered" according to supplier dashboard logic)
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE receive_scanned = TRUE)
      INTO v_total_items, v_received_items
      FROM material_items
      WHERE purchase_order_id = v_po_record.id;
      
      IF v_total_items > 0 AND v_received_items = v_total_items THEN
        RAISE NOTICE '✅ Order %: All % items are receive_scanned = true (DELIVERED)', 
          v_order_number, v_total_items;
      ELSIF v_total_items > 0 THEN
        RAISE WARNING '⚠️ Order %: Only %/% items are receive_scanned (not fully delivered)', 
          v_order_number, v_received_items, v_total_items;
      ELSE
        RAISE WARNING '⚠️ Order %: No material_items found', v_order_number;
      END IF;
      
    ELSE
      RAISE WARNING 'Order % not found in purchase_orders', v_order_number;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed. Verifying results...';
  RAISE NOTICE '========================================';
  
  -- Final verification: Show all 3 orders and their status
  FOR v_po_record IN
    SELECT 
      po.id,
      po.po_number,
      po.status as po_status,
      po.delivery_provider_id,
      dr.id as dr_id,
      dr.provider_id as dr_provider_id,
      dr.status as dr_status,
      dr.delivered_at,
      (SELECT COUNT(*) FROM material_items WHERE purchase_order_id = po.id) as total_items,
      (SELECT COUNT(*) FROM material_items WHERE purchase_order_id = po.id AND receive_scanned = TRUE) as received_items
    FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    WHERE po.po_number LIKE '%1772295614017%'
       OR po.po_number LIKE '%1772673713715%'
       OR po.po_number LIKE '%1772340447370%'
  LOOP
    RAISE NOTICE 'Order: % | PO Status: % | DR Status: % | Provider: % | Items: %/% received',
      v_po_record.po_number,
      v_po_record.po_status,
      COALESCE(v_po_record.dr_status, 'NO_DR'),
      COALESCE(v_po_record.dr_provider_id::TEXT, v_po_record.delivery_provider_id::TEXT, 'NO_PROVIDER'),
      v_po_record.received_items,
      v_po_record.total_items;
  END LOOP;
  
END $$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON purchase_orders TO authenticated;
GRANT SELECT, UPDATE, INSERT ON delivery_requests TO authenticated;
GRANT SELECT ON material_items TO authenticated;
GRANT SELECT ON delivery_providers TO authenticated;
