-- ============================================================
-- Diagnostic Query: Check if delivery request exists for order QR-1773487443217-4GJMG
-- Created: March 16, 2026
-- ============================================================

-- Check if purchase_order exists
DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
BEGIN
  -- Find purchase_order by po_number
  SELECT id, po_number, status, delivery_required, delivery_address
  INTO po_record
  FROM purchase_orders
  WHERE po_number ILIKE '%1773487443217%' 
     OR po_number ILIKE '%QR-1773487443217%'
     OR po_number ILIKE '%4GJMG%'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
      po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
    RAISE NOTICE '   Delivery address: %', po_record.delivery_address;
    
    -- Check for delivery_requests for this purchase_order
    SELECT id, status, provider_id, delivery_address, builder_id, created_at
    INTO dr_record
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF dr_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found delivery_request: ID=%, status=%, provider_id=%, delivery_address=%', 
        dr_record.id, dr_record.status, dr_record.provider_id, dr_record.delivery_address;
      RAISE NOTICE '   Builder ID: %, Created: %', dr_record.builder_id, dr_record.created_at;
    ELSE
      RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
      RAISE NOTICE '   This means the delivery request was never created or was deleted.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found with po_number containing 1773487443217';
    RAISE NOTICE '   Searching all purchase_orders with similar patterns...';
    
    -- Try broader search
    SELECT COUNT(*) INTO po_record.id
    FROM purchase_orders
    WHERE po_number ILIKE '%4GJMG%';
    
    RAISE NOTICE '   Found % purchase_orders with pattern 4GJMG', po_record.id;
  END IF;
END $$;

-- Also check RLS policies
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking RLS policies for delivery_requests...';
  RAISE NOTICE '========================================';
  
  -- List all policies
  FOR po IN 
    SELECT policyname, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'delivery_requests' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: % (Command: %)', po.policyname, po.cmd;
    RAISE NOTICE '  Condition: %', po.qual;
  END LOOP;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
