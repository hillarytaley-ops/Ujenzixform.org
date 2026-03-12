-- ===================================================================
-- FORCE CLEAR ALL DELIVERY DATA FOR taleyk@gmail.com
-- More aggressive cleanup - clears ALL delivery_requests regardless of status
-- ===================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_delivery_requests_count INTEGER;
  v_purchase_orders_count INTEGER;
BEGIN
  -- Step 1: Find user_id for taleyk@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'taleyk@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User taleyk@gmail.com not found';
  END IF;
  
  RAISE NOTICE 'Found user_id: %', v_user_id;
  
  -- Step 2: Find delivery_provider_id for this user
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE user_id = v_user_id;
  
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'No delivery_provider record found for this user';
  ELSE
    RAISE NOTICE 'Found delivery_provider_id: %', v_provider_id;
  END IF;
  
  -- Step 3: Count ALL delivery_requests assigned to this provider (any status)
  SELECT COUNT(*) INTO v_delivery_requests_count
  FROM delivery_requests
  WHERE provider_id = COALESCE(v_provider_id, v_user_id);
  
  RAISE NOTICE 'Found % delivery_requests assigned to this provider', v_delivery_requests_count;
  
  -- Step 4: FORCE CLEAR - Update ALL delivery_requests (except delivered/completed)
  -- This will clear even if they're already cancelled
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE provider_id = COALESCE(v_provider_id, v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_delivery_requests_count = ROW_COUNT;
  RAISE NOTICE 'Updated % delivery_requests (set to cancelled and cleared provider_id)', v_delivery_requests_count;
  
  -- Step 5: Also check by purchase_order_id if delivery_requests are linked via PO
  -- This catches any delivery_requests that might be linked indirectly
  UPDATE delivery_requests dr
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  FROM purchase_orders po
  WHERE dr.purchase_order_id = po.id
    AND po.delivery_provider_id = COALESCE(v_provider_id, v_user_id)
    AND dr.status NOT IN ('delivered', 'completed')
    AND dr.provider_id IS NOT NULL;
  
  GET DIAGNOSTICS v_delivery_requests_count = ROW_COUNT;
  RAISE NOTICE 'Updated % additional delivery_requests via purchase_orders link', v_delivery_requests_count;
  
  -- Step 6: Clear delivery_provider_id from ALL purchase_orders (except delivered/completed)
  UPDATE purchase_orders
  SET 
    delivery_provider_id = NULL,
    delivery_provider_name = NULL,
    delivery_assigned_at = NULL,
    updated_at = NOW()
  WHERE delivery_provider_id = COALESCE(v_provider_id, v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_purchase_orders_count = ROW_COUNT;
  RAISE NOTICE 'Cleared delivery_provider_id from % purchase_orders', v_purchase_orders_count;
  
  RAISE NOTICE '✅ FORCE CLEANUP complete for taleyk@gmail.com';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Provider ID: %', COALESCE(v_provider_id::text, 'N/A');
  RAISE NOTICE '  - Delivery requests cleared: %', v_delivery_requests_count;
  RAISE NOTICE '  - Purchase orders cleared: %', v_purchase_orders_count;
  
END $$;

-- Verification query - Should show 0 delivery_requests assigned to this provider
SELECT 
  'Delivery Requests' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE provider_id IS NULL) as without_provider,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status NOT IN ('delivered', 'completed', 'cancelled')) as still_active
FROM delivery_requests
WHERE provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)

UNION ALL

SELECT 
  'Purchase Orders' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE delivery_provider_id IS NULL) as without_provider,
  COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')) as delivered,
  COUNT(*) FILTER (WHERE delivery_provider_id IS NOT NULL AND status NOT IN ('delivered', 'completed')) as still_assigned
FROM purchase_orders
WHERE delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
);
