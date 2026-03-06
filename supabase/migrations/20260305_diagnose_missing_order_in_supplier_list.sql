-- ============================================================
-- Diagnose Missing Order in Supplier List
-- Order: PO-1772500493772-C2YYV
-- Created: March 5, 2026
-- ============================================================

-- ============================================================
-- STEP 1: Find the order and check its details
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
  v_supplier RECORD;
  v_delivery_request RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Diagnosing order: PO-1772500493772-C2YYV';
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
    po.delivery_required,
    po.created_at,
    po.updated_at
  INTO v_order
  FROM purchase_orders po
  WHERE po.po_number = 'PO-1772500493772-C2YYV'
     OR po.id::TEXT LIKE '%1772500493772%'
  LIMIT 1;
  
  IF v_order.id IS NULL THEN
    RAISE WARNING '❌ Order not found! Searching by partial match...';
    
    -- Try to find by partial po_number
    FOR v_order IN 
      SELECT 
        po.id,
        po.po_number,
        po.supplier_id,
        po.buyer_id,
        po.status,
        po.delivery_status,
        po.delivery_provider_id,
        po.delivery_required,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      WHERE po.po_number LIKE '%1772500493772%'
         OR po.po_number LIKE '%C2YYV%'
      ORDER BY po.created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE 'Found similar order: % (ID: %)', v_order.po_number, v_order.id;
    END LOOP;
    
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Order found!';
  RAISE NOTICE '  Order ID: %', v_order.id;
  RAISE NOTICE '  PO Number: %', v_order.po_number;
  RAISE NOTICE '  Supplier ID: %', v_order.supplier_id;
  RAISE NOTICE '  Buyer ID: %', v_order.buyer_id;
  RAISE NOTICE '  Status: %', v_order.status;
  RAISE NOTICE '  Delivery Status: %', v_order.delivery_status;
  RAISE NOTICE '  Delivery Provider ID: %', v_order.delivery_provider_id;
  RAISE NOTICE '  Delivery Required: %', v_order.delivery_required;
  RAISE NOTICE '  Created: %', v_order.created_at;
  
  -- Check supplier details
  SELECT 
    s.id,
    s.user_id,
    s.company_name,
    s.email
  INTO v_supplier
  FROM suppliers s
  WHERE s.id = v_order.supplier_id
     OR s.user_id = v_order.supplier_id;
  
  IF v_supplier.id IS NULL THEN
    RAISE WARNING '⚠️ Supplier not found for supplier_id: %', v_order.supplier_id;
  ELSE
    RAISE NOTICE '✅ Supplier found:';
    RAISE NOTICE '  Supplier ID: %', v_supplier.id;
    RAISE NOTICE '  User ID: %', v_supplier.user_id;
    RAISE NOTICE '  Company: %', v_supplier.company_name;
    RAISE NOTICE '  Email: %', v_supplier.email;
  END IF;
  
  -- Check delivery request
  SELECT 
    dr.id,
    dr.purchase_order_id,
    dr.provider_id,
    dr.status,
    dr.builder_id
  INTO v_delivery_request
  FROM delivery_requests dr
  WHERE dr.purchase_order_id = v_order.id
     OR (dr.builder_id = v_order.buyer_id AND dr.status = 'accepted')
  ORDER BY dr.created_at DESC
  LIMIT 1;
  
  IF v_delivery_request.id IS NOT NULL THEN
    RAISE NOTICE '✅ Delivery Request found:';
    RAISE NOTICE '  DR ID: %', v_delivery_request.id;
    RAISE NOTICE '  Purchase Order ID: %', v_delivery_request.purchase_order_id;
    RAISE NOTICE '  Provider ID: %', v_delivery_request.provider_id;
    RAISE NOTICE '  Status: %', v_delivery_request.status;
  ELSE
    RAISE WARNING '⚠️ No delivery request found for this order';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS COMPLETE';
  RAISE NOTICE '========================================';
  
  -- Check if supplier_id matches any supplier
  IF v_supplier.id IS NULL THEN
    RAISE WARNING '🔴 ISSUE: Order supplier_id (%) does not match any supplier!', v_order.supplier_id;
    RAISE NOTICE '💡 SOLUTION: Update the order supplier_id to match the correct supplier';
  END IF;
  
  -- Check if order status might be filtered out
  IF v_order.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'shipped', 'in_transit', 'delivered') THEN
    RAISE WARNING '🔴 ISSUE: Order status (%) might be filtered out in supplier dashboard', v_order.status;
  END IF;
  
END $$;

-- ============================================================
-- STEP 2: Check all suppliers that might own this order
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
  v_supplier RECORD;
BEGIN
  -- Find the order first
  SELECT po.id, po.supplier_id, po.po_number
  INTO v_order
  FROM purchase_orders po
  WHERE po.po_number = 'PO-1772500493772-C2YYV'
     OR po.id::TEXT LIKE '%1772500493772%'
  LIMIT 1;
  
  IF v_order.id IS NULL THEN
    RAISE NOTICE 'Order not found, skipping supplier check';
    RETURN;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking all suppliers...';
  RAISE NOTICE '========================================';
  
  -- Find all suppliers
  FOR v_supplier IN 
    SELECT s.id, s.user_id, s.company_name, s.email
    FROM suppliers s
    ORDER BY s.created_at DESC
    LIMIT 20
  LOOP
    IF v_supplier.id = v_order.supplier_id OR v_supplier.user_id = v_order.supplier_id THEN
      RAISE NOTICE '✅ MATCH: Supplier % (%) matches order supplier_id', 
        v_supplier.company_name, 
        v_supplier.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Show recent orders for comparison
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recent orders with similar PO numbers...';
  RAISE NOTICE '========================================';
  
  FOR v_order IN 
    SELECT 
      po.po_number,
      po.supplier_id,
      po.status,
      po.delivery_status,
      po.created_at
    FROM purchase_orders po
    WHERE po.po_number LIKE 'PO-17725%'
       OR po.po_number LIKE 'PO-17726%'
    ORDER BY po.created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE 'Order: % | Supplier: % | Status: % | Delivery: % | Created: %',
      v_order.po_number,
      v_order.supplier_id,
      v_order.status,
      v_order.delivery_status,
      v_order.created_at;
  END LOOP;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
