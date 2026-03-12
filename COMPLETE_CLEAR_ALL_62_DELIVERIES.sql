-- ===================================================================
-- COMPLETE CLEAR ALL 62 DELIVERIES FOR taleyk@gmail.com
-- This will clear ALL possible links between the provider and orders
-- ===================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_delivery_requests_count INTEGER;
  v_purchase_orders_count INTEGER;
  v_total_cleared INTEGER;
BEGIN
  -- Step 1: Find user_id for taleyk@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'taleyk@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User taleyk@gmail.com not found';
  END IF;
  
  RAISE NOTICE 'Found user_id: %', v_user_id;
  
  -- Step 2: Find ALL delivery_provider_ids for this user (in case there are multiple)
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'No delivery_provider record found - will use user_id directly';
    v_provider_id := v_user_id;
  ELSE
    RAISE NOTICE 'Found delivery_provider_id: %', v_provider_id;
  END IF;
  
  -- Step 3: Count ALL delivery_requests (any status, any link method)
  SELECT COUNT(*) INTO v_delivery_requests_count
  FROM delivery_requests
  WHERE provider_id = v_provider_id
     OR provider_id = v_user_id
     OR purchase_order_id IN (
       SELECT id FROM purchase_orders WHERE delivery_provider_id = v_provider_id
     )
     OR purchase_order_id IN (
       SELECT id FROM purchase_orders WHERE delivery_provider_id = v_user_id
     );
  
  RAISE NOTICE 'Found % total delivery_requests linked to this provider', v_delivery_requests_count;
  
  -- Step 4: Count ALL purchase_orders
  SELECT COUNT(*) INTO v_purchase_orders_count
  FROM purchase_orders
  WHERE delivery_provider_id = v_provider_id
     OR delivery_provider_id = v_user_id;
  
  RAISE NOTICE 'Found % total purchase_orders linked to this provider', v_purchase_orders_count;
  
  -- Step 5: CLEAR ALL delivery_requests (by provider_id)
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE (provider_id = v_provider_id OR provider_id = v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_delivery_requests_count = ROW_COUNT;
  RAISE NOTICE 'Cleared % delivery_requests (by provider_id)', v_delivery_requests_count;
  
  -- Step 6: CLEAR delivery_requests linked via purchase_orders
  UPDATE delivery_requests dr
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  FROM purchase_orders po
  WHERE dr.purchase_order_id = po.id
    AND (po.delivery_provider_id = v_provider_id OR po.delivery_provider_id = v_user_id)
    AND dr.status NOT IN ('delivered', 'completed')
    AND dr.provider_id IS NOT NULL;
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  RAISE NOTICE 'Cleared % additional delivery_requests (via purchase_orders link)', v_total_cleared;
  v_delivery_requests_count := v_delivery_requests_count + v_total_cleared;
  
  -- Step 7: CLEAR ALL purchase_orders
  UPDATE purchase_orders
  SET 
    delivery_provider_id = NULL,
    delivery_provider_name = NULL,
    delivery_assigned_at = NULL,
    updated_at = NOW()
  WHERE (delivery_provider_id = v_provider_id OR delivery_provider_id = v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_purchase_orders_count = ROW_COUNT;
  RAISE NOTICE 'Cleared delivery_provider_id from % purchase_orders', v_purchase_orders_count;
  
  -- Step 8: FORCE CLEAR - Update ALL remaining delivery_requests that have ANY link to this provider
  -- This is a catch-all to ensure nothing is missed
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE (
    -- Direct link via provider_id
    provider_id = v_provider_id OR provider_id = v_user_id
    -- OR linked via purchase_order that was assigned to this provider
    OR purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE delivery_provider_id = v_provider_id OR delivery_provider_id = v_user_id
    )
  )
  AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  IF v_total_cleared > 0 THEN
    RAISE NOTICE 'Force cleared % additional delivery_requests (catch-all)', v_total_cleared;
    v_delivery_requests_count := v_delivery_requests_count + v_total_cleared;
  END IF;
  
  -- Step 9: FINAL PASS - Clear ANY purchase_orders that might still have delivery_provider_id
  UPDATE purchase_orders
  SET 
    delivery_provider_id = NULL,
    delivery_provider_name = NULL,
    delivery_assigned_at = NULL,
    updated_at = NOW()
  WHERE (delivery_provider_id = v_provider_id OR delivery_provider_id = v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  IF v_total_cleared > 0 THEN
    RAISE NOTICE 'Final pass: Cleared % additional purchase_orders', v_total_cleared;
    v_purchase_orders_count := v_purchase_orders_count + v_total_cleared;
  END IF;
  
  RAISE NOTICE '✅ COMPLETE CLEANUP finished';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Provider ID: %', v_provider_id;
  RAISE NOTICE '  - Total delivery_requests cleared: %', v_delivery_requests_count;
  RAISE NOTICE '  - Total purchase_orders cleared: %', v_purchase_orders_count;
  
END $$;

-- COMPREHENSIVE VERIFICATION - Check ALL possible links
SELECT 
  'Delivery Requests by provider_id' as check_type,
  COUNT(*) as count
FROM delivery_requests
WHERE provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed')

UNION ALL

SELECT 
  'Delivery Requests via purchase_orders' as check_type,
  COUNT(*) as count
FROM delivery_requests dr
INNER JOIN purchase_orders po ON dr.purchase_order_id = po.id
WHERE po.delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND dr.status NOT IN ('delivered', 'completed')

UNION ALL

SELECT 
  'Purchase Orders with delivery_provider_id' as check_type,
  COUNT(*) as count
FROM purchase_orders
WHERE delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed');
