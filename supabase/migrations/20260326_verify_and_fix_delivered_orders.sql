-- ============================================================
-- Verify and Fix: Ensure orders with all items received show as delivered
-- This migration checks and fixes orders that should be "delivered" but aren't
-- Created: March 26, 2026
-- ============================================================

-- Function to check and fix a single order
CREATE OR REPLACE FUNCTION public.verify_and_fix_order_delivery_status(po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_items INT;
  v_received_items INT;
  v_current_status TEXT;
  v_fixed BOOLEAN := FALSE;
BEGIN
  -- Count total items and received items
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE receive_scanned = TRUE)
  INTO v_total_items, v_received_items
  FROM material_items
  WHERE purchase_order_id = po_id;
  
  -- Get current status
  SELECT status INTO v_current_status
  FROM purchase_orders
  WHERE id = po_id;
  
  -- If all items are received but status is not delivered, fix it
  IF v_total_items > 0 AND v_received_items = v_total_items AND v_current_status != 'delivered' THEN
    -- Update purchase_orders
    UPDATE purchase_orders
    SET status = 'delivered',
        delivery_status = 'delivered',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE id = po_id;
    
    -- Update delivery_requests
    UPDATE delivery_requests
    SET status = 'delivered',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE purchase_order_id = po_id
      AND status NOT IN ('delivered', 'completed', 'cancelled');
    
    v_fixed := TRUE;
  END IF;
  
  RETURN jsonb_build_object(
    'order_id', po_id,
    'total_items', v_total_items,
    'received_items', v_received_items,
    'current_status', v_current_status,
    'should_be_delivered', v_total_items > 0 AND v_received_items = v_total_items,
    'fixed', v_fixed
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_and_fix_order_delivery_status TO authenticated;

-- One-time fix: Check all orders and fix those that should be delivered
DO $$
DECLARE
  r RECORD;
  v_fixed_count INT := 0;
  v_result JSONB;
BEGIN
  FOR r IN (
    SELECT DISTINCT purchase_order_id
    FROM material_items
    WHERE purchase_order_id IS NOT NULL
  )
  LOOP
    v_result := verify_and_fix_order_delivery_status(r.purchase_order_id);
    IF (v_result->>'fixed')::BOOLEAN = TRUE THEN
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE 'Fixed order %: % items, all received', r.purchase_order_id, v_result->>'received_items';
    END IF;
  END LOOP;
  
  RAISE NOTICE 'verify_and_fix_order_delivery_status: Fixed % orders that should be delivered', v_fixed_count;
END;
$$;

COMMENT ON FUNCTION public.verify_and_fix_order_delivery_status IS 'Checks if an order has all items received and fixes the status to delivered if needed. Use this to fix orders that were scanned but did not update status.';
