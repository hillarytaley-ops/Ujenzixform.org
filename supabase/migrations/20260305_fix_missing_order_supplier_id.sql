-- ============================================================
-- Fix Missing Order in Supplier List
-- Order: PO-1772500493772-C2YYV
-- This will find the order and fix its supplier_id
-- Created: March 5, 2026
-- ============================================================

-- ============================================================
-- STEP 1: Find the order and identify the issue
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
  v_supplier RECORD;
  v_delivery_request RECORD;
  v_correct_supplier_id UUID;
  v_fixed BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixing order: PO-1772500493772-C2YYV';
  RAISE NOTICE '========================================';
  
  -- Find the order
  SELECT 
    po.id,
    po.po_number,
    po.supplier_id,
    po.buyer_id,
    po.status,
    po.delivery_status,
    po.delivery_provider_id,
    po.created_at
  INTO v_order
  FROM purchase_orders po
  WHERE po.po_number = 'PO-1772500493772-C2YYV'
     OR po.id::TEXT LIKE '%1772500493772%'
  LIMIT 1;
  
  IF v_order.id IS NULL THEN
    RAISE WARNING '❌ Order not found! Trying partial match...';
    
    -- Try partial match
    SELECT 
      po.id,
      po.po_number,
      po.supplier_id,
      po.buyer_id,
      po.status,
      po.delivery_status,
      po.delivery_provider_id,
      po.created_at
    INTO v_order
    FROM purchase_orders po
    WHERE po.po_number LIKE '%1772500493772%'
       OR po.po_number LIKE '%C2YYV%'
    ORDER BY po.created_at DESC
    LIMIT 1;
    
    IF v_order.id IS NULL THEN
      RAISE EXCEPTION 'Order PO-1772500493772-C2YYV not found in database';
    END IF;
  END IF;
  
  RAISE NOTICE '✅ Order found:';
  RAISE NOTICE '  Order ID: %', v_order.id;
  RAISE NOTICE '  PO Number: %', v_order.po_number;
  RAISE NOTICE '  Current Supplier ID: %', v_order.supplier_id;
  RAISE NOTICE '  Status: %', v_order.status;
  
  -- Check if current supplier exists
  SELECT s.id, s.user_id, s.company_name, s.email
  INTO v_supplier
  FROM suppliers s
  WHERE s.id = v_order.supplier_id
     OR s.user_id = v_order.supplier_id;
  
  IF v_supplier.id IS NOT NULL THEN
    RAISE NOTICE '✅ Current supplier exists:';
    RAISE NOTICE '  Supplier ID: %', v_supplier.id;
    RAISE NOTICE '  User ID: %', v_supplier.user_id;
    RAISE NOTICE '  Company: %', v_supplier.company_name;
    
    -- Check if there's a delivery request that might give us a clue
    SELECT dr.provider_id, dr.status
    INTO v_delivery_request
    FROM delivery_requests dr
    WHERE dr.purchase_order_id = v_order.id
    ORDER BY dr.created_at DESC
    LIMIT 1;
    
    IF v_delivery_request.provider_id IS NOT NULL THEN
      RAISE NOTICE '✅ Delivery request found with provider: %', v_delivery_request.provider_id;
    END IF;
    
    -- The supplier exists, so the issue might be:
    -- 1. The supplier_id doesn't match the logged-in user's supplier
    -- 2. RLS is blocking access
    -- 3. The order is filtered out by status
    
    RAISE NOTICE '⚠️ Supplier exists but order not showing. Possible causes:';
    RAISE NOTICE '  1. supplier_id mismatch with logged-in user';
    RAISE NOTICE '  2. Order status filtered out';
    RAISE NOTICE '  3. RLS policy blocking access';
    
    -- Try to find the supplier by checking delivery requests or other orders from same buyer
    -- Look for other orders from same buyer to see what supplier_id they use
    SELECT DISTINCT po.supplier_id
    INTO v_correct_supplier_id
    FROM purchase_orders po
    WHERE po.buyer_id = v_order.buyer_id
      AND po.supplier_id IS NOT NULL
      AND po.id != v_order.id
      AND po.created_at >= v_order.created_at - INTERVAL '7 days'
      AND po.created_at <= v_order.created_at + INTERVAL '7 days'
    ORDER BY po.created_at DESC
    LIMIT 1;
    
    IF v_correct_supplier_id IS NOT NULL AND v_correct_supplier_id != v_order.supplier_id THEN
      RAISE NOTICE '💡 Found different supplier_id from similar orders: %', v_correct_supplier_id;
      RAISE NOTICE '   This might be the correct supplier_id';
      
      -- Verify this supplier exists
      SELECT s.id INTO v_supplier
      FROM suppliers s
      WHERE s.id = v_correct_supplier_id;
      
      IF v_supplier.id IS NOT NULL THEN
        RAISE NOTICE '✅ Verified supplier exists. Updating order...';
        UPDATE purchase_orders
        SET supplier_id = v_correct_supplier_id,
            updated_at = NOW()
        WHERE id = v_order.id;
        v_fixed := TRUE;
        RAISE NOTICE '✅ Order updated with supplier_id: %', v_correct_supplier_id;
      END IF;
    END IF;
    
  ELSE
    RAISE WARNING '❌ Current supplier_id (%) does not exist!', v_order.supplier_id;
    
    -- Try to find the correct supplier
    -- Method 1: Find supplier by checking delivery requests
    IF v_order.delivery_provider_id IS NOT NULL THEN
      -- This won't help, but let's check other orders
      NULL;
    END IF;
    
    -- Method 2: Find supplier from other orders by same buyer around same time
    SELECT DISTINCT po.supplier_id
    INTO v_correct_supplier_id
    FROM purchase_orders po
    WHERE po.buyer_id = v_order.buyer_id
      AND po.supplier_id IS NOT NULL
      AND po.id != v_order.id
      AND po.created_at >= v_order.created_at - INTERVAL '30 days'
      AND po.created_at <= v_order.created_at + INTERVAL '7 days'
    ORDER BY po.created_at DESC
    LIMIT 1;
    
    IF v_correct_supplier_id IS NOT NULL THEN
      RAISE NOTICE '💡 Found supplier_id from similar orders: %', v_correct_supplier_id;
      
      -- Verify supplier exists
      SELECT s.id INTO v_supplier
      FROM suppliers s
      WHERE s.id = v_correct_supplier_id;
      
      IF v_supplier.id IS NOT NULL THEN
        RAISE NOTICE '✅ Verified supplier exists. Updating order...';
        UPDATE purchase_orders
        SET supplier_id = v_correct_supplier_id,
            updated_at = NOW()
        WHERE id = v_order.id;
        v_fixed := TRUE;
        RAISE NOTICE '✅ Order updated with supplier_id: %', v_correct_supplier_id;
      ELSE
        RAISE WARNING '⚠️ Found supplier_id but it does not exist in suppliers table';
      END IF;
    ELSE
      RAISE WARNING '⚠️ Could not find a valid supplier_id to use';
      RAISE NOTICE '💡 You may need to manually update the order with the correct supplier_id';
      RAISE NOTICE '   Find your supplier ID from the suppliers table, then run:';
      RAISE NOTICE '   UPDATE purchase_orders SET supplier_id = ''YOUR_SUPPLIER_ID'' WHERE po_number = ''PO-1772500493772-C2YYV'';';
    END IF;
  END IF;
  
  RAISE NOTICE '========================================';
  IF v_fixed THEN
    RAISE NOTICE '✅ FIX COMPLETE: Order supplier_id has been updated';
  ELSE
    RAISE NOTICE '⚠️ FIX INCOMPLETE: Could not automatically fix. See messages above.';
  END IF;
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================
-- STEP 2: Verify the fix
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
  v_supplier RECORD;
BEGIN
  SELECT 
    po.id,
    po.po_number,
    po.supplier_id,
    po.status
  INTO v_order
  FROM purchase_orders po
  WHERE po.po_number = 'PO-1772500493772-C2YYV'
     OR po.id::TEXT LIKE '%1772500493772%'
  LIMIT 1;
  
  IF v_order.id IS NULL THEN
    RETURN;
  END IF;
  
  SELECT s.id, s.company_name, s.email
  INTO v_supplier
  FROM suppliers s
  WHERE s.id = v_order.supplier_id;
  
  IF v_supplier.id IS NOT NULL THEN
    RAISE NOTICE '✅ VERIFICATION: Order now has valid supplier:';
    RAISE NOTICE '   Supplier ID: %', v_supplier.id;
    RAISE NOTICE '   Company: %', v_supplier.company_name;
    RAISE NOTICE '   Email: %', v_supplier.email;
  ELSE
    RAISE WARNING '❌ VERIFICATION FAILED: Supplier still not found';
  END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
