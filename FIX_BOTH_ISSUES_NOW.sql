-- ===================================================================
-- FIX BOTH ISSUES:
-- 1. Create missing order_status_history table (fixes delivery acceptance)
-- 2. Clear ALL delivery data for taleyk@gmail.com (fixes 62 count)
-- ===================================================================

-- ===================================================================
-- PART 1: CREATE order_status_history TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON public.order_status_history(created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "System can insert status history" ON public.order_status_history;

CREATE POLICY "Users can view order status history"
    ON public.order_status_history FOR SELECT
    USING (TRUE);

CREATE POLICY "System can insert status history"
    ON public.order_status_history FOR INSERT
    WITH CHECK (TRUE);

GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT SELECT, INSERT ON public.order_status_history TO anon;

-- ===================================================================
-- PART 2: CLEAR ALL DELIVERY DATA FOR taleyk@gmail.com
-- ===================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_delivery_requests_cleared INTEGER := 0;
  v_purchase_orders_cleared INTEGER := 0;
  v_total_cleared INTEGER;
BEGIN
  -- Step 1: Find user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'taleyk@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User taleyk@gmail.com not found';
  END IF;
  
  RAISE NOTICE 'Found user_id: %', v_user_id;
  
  -- Step 2: Find provider_id
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
  
  -- Step 3: CLEAR ALL delivery_requests (any status except delivered/completed)
  -- Clear by provider_id
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE (provider_id = v_provider_id OR provider_id = v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  v_delivery_requests_cleared := v_delivery_requests_cleared + v_total_cleared;
  RAISE NOTICE 'Cleared % delivery_requests (by provider_id)', v_total_cleared;
  
  -- Clear delivery_requests linked via purchase_orders
  UPDATE delivery_requests dr
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  FROM purchase_orders po
  WHERE dr.purchase_order_id = po.id
    AND (po.delivery_provider_id = v_provider_id OR po.delivery_provider_id = v_user_id)
    AND dr.status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  v_delivery_requests_cleared := v_delivery_requests_cleared + v_total_cleared;
  RAISE NOTICE 'Cleared % additional delivery_requests (via purchase_orders)', v_total_cleared;
  
  -- Step 4: CLEAR ALL purchase_orders
  UPDATE purchase_orders
  SET 
    delivery_provider_id = NULL,
    delivery_provider_name = NULL,
    delivery_assigned_at = NULL,
    updated_at = NOW()
  WHERE (delivery_provider_id = v_provider_id OR delivery_provider_id = v_user_id)
    AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_purchase_orders_cleared = ROW_COUNT;
  RAISE NOTICE 'Cleared delivery_provider_id from % purchase_orders', v_purchase_orders_cleared;
  
  -- Step 5: FINAL PASS - Clear ANY remaining delivery_requests
  UPDATE delivery_requests
  SET 
    status = 'cancelled',
    provider_id = NULL,
    updated_at = NOW()
  WHERE (
    provider_id = v_provider_id OR provider_id = v_user_id
    OR purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE delivery_provider_id = v_provider_id OR delivery_provider_id = v_user_id
    )
  )
  AND status NOT IN ('delivered', 'completed');
  
  GET DIAGNOSTICS v_total_cleared = ROW_COUNT;
  IF v_total_cleared > 0 THEN
    v_delivery_requests_cleared := v_delivery_requests_cleared + v_total_cleared;
    RAISE NOTICE 'Final pass: Cleared % additional delivery_requests', v_total_cleared;
  END IF;
  
  RAISE NOTICE '✅ CLEANUP COMPLETE';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Provider ID: %', v_provider_id;
  RAISE NOTICE '  - Total delivery_requests cleared: %', v_delivery_requests_cleared;
  RAISE NOTICE '  - Total purchase_orders cleared: %', v_purchase_orders_cleared;
  
END $$;

-- VERIFICATION
SELECT 
  'After Cleanup - Delivery Requests' as check_type,
  COUNT(*) as count
FROM delivery_requests
WHERE provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed', 'cancelled')

UNION ALL

SELECT 
  'After Cleanup - Purchase Orders' as check_type,
  COUNT(*) as count
FROM purchase_orders
WHERE delivery_provider_id IN (
  SELECT id FROM delivery_providers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com')
  UNION
  SELECT id FROM auth.users WHERE email = 'taleyk@gmail.com'
)
AND status NOT IN ('delivered', 'completed');
