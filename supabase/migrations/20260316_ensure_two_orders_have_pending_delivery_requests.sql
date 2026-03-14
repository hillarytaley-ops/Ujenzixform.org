-- ============================================================
-- Ensure Two Orders Have Pending Delivery Requests
-- Orders: QR-1773490484717-QHDSE and QR-1773487443217-4GJMG
-- 
-- This migration will:
-- 1. Find the purchase_orders for these two orders
-- 2. Check if delivery_requests exist
-- 3. If they don't exist or are cancelled/rejected, create/update them to pending status
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
  builder_id_val UUID;
  new_dr_id UUID;
  order_patterns TEXT[] := ARRAY[
    'QR-1773490484717-QHDSE',
    'QR-1773487443217-4GJMG'
  ];
  order_pattern TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ensuring delivery_requests exist for two orders';
  RAISE NOTICE '========================================';
  
  -- Process each order
  FOREACH order_pattern IN ARRAY order_patterns
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '--- Processing Order: % ---', order_pattern;
    
    -- Find purchase_order
    SELECT id, po_number, status, delivery_required, delivery_address, builder_id, created_at
    INTO po_record
    FROM purchase_orders
    WHERE po_number ILIKE '%' || SPLIT_PART(order_pattern, '-', 2) || '%'
       OR po_number ILIKE '%' || SPLIT_PART(order_pattern, '-', 3) || '%'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF po_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
        po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
      
      -- Get builder_id
      builder_id_val := po_record.builder_id;
      IF builder_id_val IS NULL THEN
        -- Try to get builder_id from profiles table
        SELECT id INTO builder_id_val
        FROM profiles
        WHERE user_id IN (
          SELECT user_id FROM purchase_orders WHERE id = po_record.id
        )
        LIMIT 1;
      END IF;
      
      IF builder_id_val IS NULL THEN
        RAISE NOTICE '⚠️ WARNING: Could not find builder_id for purchase_order %', po_record.id;
        RAISE NOTICE '   Skipping this order - cannot create delivery_request without builder_id';
        CONTINUE;
      END IF;
      
      RAISE NOTICE '   Builder ID: %', builder_id_val;
      
      -- Check for existing delivery_requests
      SELECT id, status, provider_id, delivery_address, created_at
      INTO dr_record
      FROM delivery_requests
      WHERE purchase_order_id = po_record.id
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF dr_record.id IS NOT NULL THEN
        RAISE NOTICE '✅ Found existing delivery_request: ID=%, status=%, provider_id=%', 
          dr_record.id, dr_record.status, dr_record.provider_id;
        
        -- If status is cancelled/rejected, update to pending
        IF dr_record.status IN ('cancelled', 'rejected') THEN
          RAISE NOTICE '   Updating cancelled/rejected delivery_request to pending...';
          UPDATE delivery_requests
          SET 
            status = 'pending',
            provider_id = NULL,
            rejection_reason = NULL,
            rejected_at = NULL,
            updated_at = NOW()
          WHERE id = dr_record.id;
          RAISE NOTICE '   ✅ Updated delivery_request % to pending status', dr_record.id;
        ELSIF dr_record.status NOT IN ('pending', 'requested', 'assigned') THEN
          RAISE NOTICE '   ⚠️ Delivery request has status % (not pending/requested/assigned) - will not appear in Alert tab', dr_record.status;
          RAISE NOTICE '   Consider updating it to pending if it should be visible to providers';
        ELSE
          RAISE NOTICE '   ✅ Delivery request is already in pending/requested/assigned status';
        END IF;
      ELSE
        RAISE NOTICE '❌ NO delivery_request found for purchase_order %', po_record.id;
        RAISE NOTICE '   Creating new delivery_request...';
        
        -- Create new delivery_request
        new_dr_id := gen_random_uuid();
        INSERT INTO delivery_requests (
          id,
          purchase_order_id,
          builder_id,
          status,
          delivery_address,
          pickup_address,
          material_type,
          quantity,
          preferred_date,
          created_at,
          updated_at
        ) VALUES (
          new_dr_id,
          po_record.id,
          builder_id_val,
          'pending',
          COALESCE(po_record.delivery_address, 'To be provided'),
          'Nairobi, Kenya', -- Default pickup
          'construction_materials', -- Default material type
          1, -- Default quantity
          CURRENT_DATE + INTERVAL '1 day', -- Default to tomorrow
          NOW(),
          NOW()
        );
        
        RAISE NOTICE '   ✅ Created new delivery_request: ID=%, status=pending', new_dr_id;
      END IF;
    ELSE
      RAISE NOTICE '❌ Purchase_order NOT found for pattern: %', order_pattern;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary: Check complete';
  RAISE NOTICE '========================================';
END $$;
