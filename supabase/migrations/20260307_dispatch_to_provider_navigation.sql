-- ============================================================
-- Dispatch to Provider Navigation Trigger
-- When supplier dispatches items (scans QR codes), update delivery_requests
-- so the delivery provider's Schedule/In Transit tab activates navigation
-- Created: March 7, 2026
-- ============================================================

-- ============================================================
-- STEP 1: Create trigger to sync dispatch status to delivery_requests
-- ============================================================
CREATE OR REPLACE FUNCTION sync_dispatch_to_delivery_request()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_request_id UUID;
  v_purchase_order_id UUID;
  v_all_dispatched BOOLEAN;
  v_dispatched_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- When a material_item is dispatch scanned, check if all items are dispatched
  IF NEW.dispatch_scanned = TRUE AND (OLD.dispatch_scanned IS NULL OR OLD.dispatch_scanned = FALSE) THEN
    v_purchase_order_id := NEW.purchase_order_id;
    
    -- Count dispatched vs total items for this order
    SELECT 
      COUNT(*) FILTER (WHERE dispatch_scanned = TRUE),
      COUNT(*)
    INTO v_dispatched_count, v_total_count
    FROM material_items
    WHERE purchase_order_id = v_purchase_order_id;
    
    v_all_dispatched := (v_dispatched_count = v_total_count);
    
    RAISE NOTICE '📦 Dispatch scan: Order % - Dispatched %/% items', v_purchase_order_id, v_dispatched_count, v_total_count;
    
    -- Find the delivery_request for this purchase order
    SELECT id INTO v_delivery_request_id
    FROM delivery_requests
    WHERE purchase_order_id = v_purchase_order_id
    LIMIT 1;
    
    IF v_delivery_request_id IS NOT NULL THEN
      -- Update delivery_request status based on dispatch progress
      IF v_all_dispatched THEN
        -- All items dispatched - set to 'dispatched' for provider to pick up
        UPDATE delivery_requests
        SET 
          status = 'dispatched',
          dispatch_completed_at = NOW(),
          updated_at = NOW()
        WHERE id = v_delivery_request_id
          AND status IN ('accepted', 'assigned', 'pending_dispatch');
        
        RAISE NOTICE '✅ All items dispatched - delivery_request % updated to dispatched', v_delivery_request_id;
        
        -- Also update purchase_order status
        UPDATE purchase_orders
        SET 
          status = 'dispatched',
          delivery_status = 'dispatched',
          dispatched_at = NOW(),
          updated_at = NOW()
        WHERE id = v_purchase_order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
          
      ELSE
        -- Partial dispatch - update to show progress
        UPDATE delivery_requests
        SET 
          dispatch_progress = ROUND((v_dispatched_count::NUMERIC / v_total_count::NUMERIC) * 100),
          updated_at = NOW()
        WHERE id = v_delivery_request_id;
      END IF;
    ELSE
      -- No delivery_request exists yet - update purchase_order directly
      IF v_all_dispatched THEN
        UPDATE purchase_orders
        SET 
          status = 'dispatched',
          delivery_status = 'dispatched', 
          dispatched_at = NOW(),
          updated_at = NOW()
        WHERE id = v_purchase_order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
          
        RAISE NOTICE '✅ All items dispatched - purchase_order % updated to dispatched (no delivery_request)', v_purchase_order_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_dispatch_to_delivery ON material_items;

-- Create trigger on material_items dispatch scan
CREATE TRIGGER trigger_sync_dispatch_to_delivery
  AFTER UPDATE ON material_items
  FOR EACH ROW
  WHEN (NEW.dispatch_scanned = TRUE AND (OLD.dispatch_scanned IS NULL OR OLD.dispatch_scanned = FALSE))
  EXECUTE FUNCTION sync_dispatch_to_delivery_request();

-- ============================================================
-- STEP 2: Add missing columns to delivery_requests if they don't exist
-- ============================================================
DO $$
BEGIN
  -- Add dispatch_completed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'dispatch_completed_at'
  ) THEN
    ALTER TABLE delivery_requests ADD COLUMN dispatch_completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added dispatch_completed_at column to delivery_requests';
  END IF;
  
  -- Add dispatch_progress column (0-100 percentage)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'dispatch_progress'
  ) THEN
    ALTER TABLE delivery_requests ADD COLUMN dispatch_progress INTEGER DEFAULT 0;
    RAISE NOTICE 'Added dispatch_progress column to delivery_requests';
  END IF;
  
  -- Add dispatched_at column to purchase_orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'dispatched_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN dispatched_at TIMESTAMPTZ;
    RAISE NOTICE 'Added dispatched_at column to purchase_orders';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Create function to get provider's active deliveries (for dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION get_provider_active_deliveries(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  order_number TEXT,
  status TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  material_type TEXT,
  quantity INTEGER,
  builder_name TEXT,
  builder_phone TEXT,
  price NUMERIC,
  dispatch_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Get from delivery_requests
  SELECT 
    dr.id,
    dr.purchase_order_id,
    COALESCE(po.po_number, 'PO-' || LEFT(dr.purchase_order_id::TEXT, 8)) as order_number,
    dr.status,
    dr.pickup_address,
    dr.delivery_address,
    dr.material_type,
    COALESCE(dr.quantity, 1)::INTEGER as quantity,
    COALESCE(p.full_name, dr.builder_name, 'Builder') as builder_name,
    COALESCE(p.phone, dr.builder_phone, '') as builder_phone,
    COALESCE(dr.estimated_cost, po.total_amount, 0) as price,
    dr.dispatch_completed_at,
    dr.created_at,
    'delivery_requests'::TEXT as source
  FROM delivery_requests dr
  LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
  LEFT JOIN profiles p ON p.id = dr.builder_id OR p.user_id = dr.builder_id
  WHERE dr.provider_id = p_provider_id
    AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
    
  UNION ALL
  
  -- Get from purchase_orders (orders assigned to provider but without delivery_request)
  SELECT
    po.id,
    po.id as purchase_order_id,
    COALESCE(po.po_number, 'PO-' || LEFT(po.id::TEXT, 8)) as order_number,
    po.status,
    COALESCE(s.address, 'Supplier location') as pickup_address,
    po.delivery_address,
    COALESCE(
      (SELECT string_agg(item->>'name', ', ') FROM jsonb_array_elements(po.items) AS item),
      'Materials'
    ) as material_type,
    COALESCE(
      (SELECT SUM((item->>'quantity')::INTEGER) FROM jsonb_array_elements(po.items) AS item),
      1
    )::INTEGER as quantity,
    COALESCE(p.full_name, 'Builder') as builder_name,
    COALESCE(p.phone, '') as builder_phone,
    COALESCE(po.total_amount, 0) as price,
    po.dispatched_at as dispatch_completed_at,
    po.created_at,
    'purchase_orders'::TEXT as source
  FROM purchase_orders po
  LEFT JOIN profiles p ON p.id = po.buyer_id OR p.user_id = po.buyer_id
  LEFT JOIN suppliers s ON s.id = po.supplier_id
  WHERE po.delivery_provider_id = p_provider_id
    AND po.status NOT IN ('delivered', 'completed', 'cancelled')
    AND NOT EXISTS (
      SELECT 1 FROM delivery_requests dr 
      WHERE dr.purchase_order_id = po.id 
      AND dr.provider_id = p_provider_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_provider_active_deliveries(UUID) TO authenticated;

-- ============================================================
-- STEP 4: Backfill - Update delivery_requests for already dispatched orders
-- ============================================================
DO $$
DECLARE
  v_order RECORD;
  v_delivery_request_id UUID;
  v_updated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill for dispatched orders...';
  
  FOR v_order IN
    SELECT 
      po.id as purchase_order_id,
      po.status,
      (SELECT COUNT(*) FROM material_items WHERE purchase_order_id = po.id AND dispatch_scanned = TRUE) as dispatched_count,
      (SELECT COUNT(*) FROM material_items WHERE purchase_order_id = po.id) as total_count
    FROM purchase_orders po
    WHERE po.status IN ('shipped', 'dispatched', 'in_transit')
      AND EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id AND dispatch_scanned = TRUE)
  LOOP
    -- Find delivery_request
    SELECT id INTO v_delivery_request_id
    FROM delivery_requests
    WHERE purchase_order_id = v_order.purchase_order_id
    LIMIT 1;
    
    IF v_delivery_request_id IS NOT NULL THEN
      IF v_order.dispatched_count = v_order.total_count THEN
        -- All items dispatched
        UPDATE delivery_requests
        SET 
          status = CASE WHEN status IN ('accepted', 'assigned', 'pending_dispatch') THEN 'dispatched' ELSE status END,
          dispatch_completed_at = COALESCE(dispatch_completed_at, NOW()),
          dispatch_progress = 100,
          updated_at = NOW()
        WHERE id = v_delivery_request_id;
        v_updated := v_updated + 1;
      ELSE
        -- Partial dispatch
        UPDATE delivery_requests
        SET 
          dispatch_progress = ROUND((v_order.dispatched_count::NUMERIC / v_order.total_count::NUMERIC) * 100),
          updated_at = NOW()
        WHERE id = v_delivery_request_id;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Updated % delivery_requests with dispatch status', v_updated;
END $$;

-- ============================================================
-- STEP 5: Verification
-- ============================================================
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_dispatch_to_delivery'
  ) INTO v_trigger_exists;
  
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'sync_dispatch_to_delivery_request'
  ) INTO v_function_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DISPATCH TO PROVIDER NAVIGATION SETUP';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
  RAISE NOTICE 'Function exists: %', v_function_exists;
  
  IF v_trigger_exists AND v_function_exists THEN
    RAISE NOTICE '✅ SUCCESS: Dispatch to provider navigation is now active!';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '1. Supplier scans QR codes at dispatch';
    RAISE NOTICE '2. Trigger updates delivery_requests status to "dispatched"';
    RAISE NOTICE '3. Provider dashboard shows order in Schedule/In Transit tab';
    RAISE NOTICE '4. Navigation is activated for the provider';
  ELSE
    RAISE WARNING '❌ FAILED: Some components are missing';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
