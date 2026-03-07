-- ============================================================
-- Fix: Change purchase_orders status from 'shipped' to 'dispatched'
-- The 'shipped' status is not valid according to purchase_orders_status_check constraint
-- Created: March 7, 2026
-- ============================================================

-- Drop all existing versions of record_qr_scan to avoid ambiguity
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT);

-- Update the record_qr_scan function to use 'dispatched' instead of 'shipped'
CREATE OR REPLACE FUNCTION public.record_qr_scan(
    _qr_code TEXT,
    _scan_type TEXT,
    _scanned_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    material_item_record RECORD;
    order_id UUID;
    delivery_request_id UUID;
    scan_event_id UUID;
    result JSONB;
    v_all_items_dispatched BOOLEAN;
    v_all_items_received BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := COALESCE(_scanned_by, auth.uid());
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Validate scan type
    IF _scan_type NOT IN ('dispatch', 'receiving') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid scan_type. Must be "dispatch" or "receiving"'
        );
    END IF;
    
    -- Find material_item by QR code
    SELECT * INTO material_item_record
    FROM material_items
    WHERE qr_code = _qr_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'QR code not found'
        );
    END IF;
    
    order_id := material_item_record.purchase_order_id;
    
    -- Create scan event record
    INSERT INTO qr_scan_events (
        qr_code,
        material_item_id,
        purchase_order_id,
        scan_type,
        scanned_by,
        scanned_at
    ) VALUES (
        _qr_code,
        material_item_record.id,
        order_id,
        _scan_type,
        current_user_id,
        NOW()
    )
    RETURNING id INTO scan_event_id;
    
    -- Handle dispatch scan
    IF _scan_type = 'dispatch' THEN
        -- Prevent re-scanning if already dispatched
        IF material_item_record.dispatch_scanned = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Item already dispatched'
            );
        END IF;
        
        -- Update material_item
        UPDATE material_items
        SET 
            dispatch_scan_id = scan_event_id,
            dispatch_scanned = TRUE,
            dispatch_scanned_at = NOW(),
            dispatch_scanned_by = current_user_id,
            updated_at = NOW()
        WHERE qr_code = _qr_code;
        
        -- Update purchase_order status to 'dispatched' (not 'shipped' - that's not a valid status)
        IF order_id IS NOT NULL THEN
          UPDATE purchase_orders
          SET status = 'dispatched',
              updated_at = NOW()
          WHERE id = order_id
            AND status IN ('confirmed', 'processing', 'pending', 'accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'delivery_assigned', 'ready_for_dispatch');
          
          -- ============================================================
          -- AUTO-UPDATE delivery_requests.status to 'in_transit'
          -- This moves the delivery from Scheduled to In Transit tab
          -- ============================================================
          -- Find the delivery_request linked to this purchase_order
          SELECT id INTO delivery_request_id
          FROM delivery_requests
          WHERE purchase_order_id = order_id
            AND status IN ('accepted', 'assigned', 'pending', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned')
          LIMIT 1;
          
          -- AUTO-UPDATE delivery_requests.status to 'in_transit'
          IF delivery_request_id IS NOT NULL THEN
            UPDATE delivery_requests
            SET status = 'in_transit',
                updated_at = NOW()
            WHERE id = delivery_request_id
              AND status IN ('accepted', 'assigned', 'pending', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned');
            
            RAISE NOTICE 'Updated delivery_request % status to in_transit (supplier dispatched)', delivery_request_id;
          END IF;
        END IF;
        
        -- Check if all items are dispatched
        SELECT 
            COUNT(*) = COUNT(*) FILTER (WHERE dispatch_scanned = TRUE)
        INTO v_all_items_dispatched
        FROM material_items
        WHERE purchase_order_id = order_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Item dispatched successfully. Order status updated to DISPATCHED.',
            'material_item_id', material_item_record.id,
            'order_id', order_id,
            'all_items_dispatched', v_all_items_dispatched,
            'scan_event_id', scan_event_id
        );
    
    -- Handle receiving scan
    ELSIF _scan_type = 'receiving' THEN
        -- Prevent re-scanning if already received
        IF material_item_record.receive_scanned = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Item already received'
            );
        END IF;
        
        -- Update material_item
        UPDATE material_items
        SET 
            receive_scan_id = scan_event_id,
            receive_scanned = TRUE,
            receive_scanned_at = NOW(),
            receive_scanned_by = current_user_id,
            updated_at = NOW()
        WHERE qr_code = _qr_code;
        
        -- Check if all items are received
        SELECT 
            COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
        INTO v_all_items_received
        FROM material_items
        WHERE purchase_order_id = order_id;
        
        -- Update purchase_order and delivery_request if all items received
        IF v_all_items_received AND order_id IS NOT NULL THEN
            -- Update purchase_order status
            UPDATE purchase_orders
            SET 
                status = 'delivered',
                delivered_at = COALESCE(delivered_at, NOW()),
                updated_at = NOW()
            WHERE id = order_id
              AND status NOT IN ('delivered', 'completed', 'cancelled');
            
            -- Find and update delivery_request
            SELECT id INTO delivery_request_id
            FROM delivery_requests
            WHERE purchase_order_id = order_id
              AND status NOT IN ('delivered', 'completed', 'cancelled')
            LIMIT 1;
            
            IF delivery_request_id IS NOT NULL THEN
                UPDATE delivery_requests
                SET 
                    status = 'delivered',
                    delivered_at = COALESCE(delivered_at, NOW()),
                    updated_at = NOW()
                WHERE id = delivery_request_id
                  AND status NOT IN ('delivered', 'completed', 'cancelled');
                
                RAISE NOTICE 'Updated delivery_request % status to delivered (all items received)', delivery_request_id;
            END IF;
        END IF;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Item received successfully.',
            'material_item_id', material_item_record.id,
            'order_id', order_id,
            'all_items_received', v_all_items_received,
            'scan_event_id', scan_event_id
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_qr_scan IS 'Records QR scan events and automatically updates delivery_requests status: in_transit on dispatch, delivered on receiving. Uses "dispatched" status for purchase_orders (not "shipped").';
