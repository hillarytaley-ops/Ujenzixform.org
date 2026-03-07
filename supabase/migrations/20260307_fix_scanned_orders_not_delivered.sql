-- ============================================================
-- Fix Scanned Orders Not Showing in Delivered Tab
-- Created: March 7, 2026
-- 
-- This migration fixes orders that have been scanned (all items received)
-- but their delivery_request status is still 'in_transit' or other statuses
-- instead of 'delivered'. This ensures they appear in the "Delivered" tab.
-- ============================================================

-- Function to fix delivery_request status for orders where all items are scanned
CREATE OR REPLACE FUNCTION fix_scanned_orders_delivery_status()
RETURNS TABLE(
  purchase_order_id UUID,
  delivery_request_id UUID,
  old_status TEXT,
  new_status TEXT,
  items_scanned INTEGER,
  total_items INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_dr_id UUID;
  v_old_status TEXT;
  v_items_scanned INTEGER;
  v_total_items INTEGER;
BEGIN
  -- Find all purchase_orders where all items are scanned but status might not be 'delivered'
  FOR v_po IN
    SELECT 
      po.id as purchase_order_id,
      po.status as po_status,
      COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) as scanned_count,
      COUNT(mi.id) as total_count
    FROM purchase_orders po
    LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
    WHERE po.status IN ('shipped', 'dispatched', 'in_transit', 'processing', 'confirmed', 'accepted')
      OR po.status IS NULL
    GROUP BY po.id, po.status
    HAVING COUNT(mi.id) > 0 
      AND COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) = COUNT(mi.id)
      AND COUNT(mi.id) FILTER (WHERE mi.receive_scanned = TRUE) > 0
  LOOP
    -- Get delivery_request for this purchase_order
    SELECT dr.id, dr.status INTO v_dr_id, v_old_status
    FROM delivery_requests dr
    WHERE dr.purchase_order_id = v_po.purchase_order_id
      AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
    LIMIT 1;
    
    -- If delivery_request exists and status is not 'delivered', update it
    IF v_dr_id IS NOT NULL AND v_old_status != 'delivered' THEN
      UPDATE delivery_requests
      SET status = 'delivered',
          delivered_at = COALESCE(delivered_at, NOW()),
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
      WHERE id = v_dr_id;
      
      -- Also update purchase_order status to 'delivered' if not already
      IF v_po.po_status != 'delivered' AND v_po.po_status != 'completed' THEN
        UPDATE purchase_orders
        SET status = 'delivered',
            updated_at = NOW()
        WHERE id = v_po.purchase_order_id;
      END IF;
      
      -- Return the fix information
      purchase_order_id := v_po.purchase_order_id;
      delivery_request_id := v_dr_id;
      old_status := v_old_status;
      new_status := 'delivered';
      items_scanned := v_po.scanned_count;
      total_items := v_po.total_count;
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Execute the function to fix existing orders
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM fix_scanned_orders_delivery_status();
  
  RAISE NOTICE 'Fixed % delivery_requests that had all items scanned but were not marked as delivered', fixed_count;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_scanned_orders_delivery_status TO authenticated;

-- Add comment
COMMENT ON FUNCTION fix_scanned_orders_delivery_status IS 'Fixes delivery_request status for orders where all items are scanned but status is not delivered';
