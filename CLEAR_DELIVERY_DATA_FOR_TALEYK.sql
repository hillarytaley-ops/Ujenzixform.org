-- ===================================================================
-- CLEAR ALL DELIVERY REQUEST DATA FOR taleyk@gmail.com
-- This script will:
-- 1. Find the user_id for taleyk@gmail.com
-- 2. Find the delivery_provider_id associated with that user
-- 3. Clear/update delivery_requests assigned to that provider
-- 4. Clear purchase_orders.delivery_provider_id for orders assigned to that provider
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
  
  -- Step 3: Count delivery_requests assigned to this provider
  SELECT COUNT(*) INTO v_delivery_requests_count
  FROM delivery_requests
  WHERE provider_id = COALESCE(v_provider_id, v_user_id);
  
  RAISE NOTICE 'Found % delivery_requests assigned to this provider', v_delivery_requests_count;
  
  -- Step 4: Count purchase_orders assigned to this provider
  SELECT COUNT(*) INTO v_purchase_orders_count
  FROM purchase_orders
  WHERE delivery_provider_id = COALESCE(v_provider_id, v_user_id);
  
  RAISE NOTICE 'Found % purchase_orders assigned to this provider', v_purchase_orders_count;
  
  -- Step 5: Update ALL delivery_requests - set status to 'cancelled' and clear provider_id
  -- Force update ALL statuses (except already delivered/completed) to ensure complete cleanup
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE provider_id = COALESCE(v_provider_id, v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_delivery_requests_count = ROW_COUNT;
  RAISE NOTICE 'Updated % delivery_requests (set to cancelled and cleared provider_id)', v_delivery_requests_count;
  
  -- Step 6: Clear delivery_provider_id from purchase_orders
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
  
  -- Step 7: Optionally, you can also delete the delivery_provider record (uncomment if needed)
  -- DELETE FROM delivery_providers WHERE id = v_provider_id;
  -- RAISE NOTICE 'Deleted delivery_provider record';
  
  RAISE NOTICE '✅ Cleanup complete for taleyk@gmail.com';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Provider ID: %', COALESCE(v_provider_id::text, 'N/A');
  RAISE NOTICE '  - Delivery requests cancelled: %', v_delivery_requests_count;
  RAISE NOTICE '  - Purchase orders cleared: %', v_purchase_orders_count;
  
END $$;

-- Verification query - Run this after the cleanup to verify
SELECT 
  'Delivery Requests' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE provider_id IS NULL) as without_provider,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
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
  COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')) as delivered
FROM purchase_orders
WHERE delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
);
