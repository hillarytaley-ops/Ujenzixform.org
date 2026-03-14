-- =====================================================================
-- DELETE SPECIFIC ORDERS AND THEIR QR CODES
-- =====================================================================
-- This migration deletes two specific orders and all their related data:
-- 1. QR-1773464295666-01T1P
-- 2. QR-1773461741050-CB8XY
-- =====================================================================

DO $$
DECLARE
    order1_id UUID;
    order2_id UUID;
    deleted_qr_codes INTEGER := 0;
    deleted_delivery_requests INTEGER := 0;
    deleted_material_items INTEGER := 0;
    deleted_orders INTEGER := 0;
BEGIN
    -- Find the purchase order IDs by po_number
    SELECT id INTO order1_id FROM purchase_orders WHERE po_number = 'QR-1773464295666-01T1P' LIMIT 1;
    SELECT id INTO order2_id FROM purchase_orders WHERE po_number = 'QR-1773461741050-CB8XY' LIMIT 1;
    
    -- Log what we found
    IF order1_id IS NOT NULL THEN
        RAISE NOTICE 'Found order 1: QR-1773464295666-01T1P (ID: %)', order1_id;
    ELSE
        RAISE NOTICE 'Order 1 not found: QR-1773464295666-01T1P';
    END IF;
    
    IF order2_id IS NOT NULL THEN
        RAISE NOTICE 'Found order 2: QR-1773461741050-CB8XY (ID: %)', order2_id;
    ELSE
        RAISE NOTICE 'Order 2 not found: QR-1773461741050-CB8XY';
    END IF;
    
    -- Delete material_qr_codes linked to these orders
    IF order1_id IS NOT NULL THEN
        DELETE FROM material_qr_codes WHERE purchase_order_id = order1_id;
        GET DIAGNOSTICS deleted_qr_codes = ROW_COUNT;
        RAISE NOTICE 'Deleted % QR codes for order 1', deleted_qr_codes;
    END IF;
    
    IF order2_id IS NOT NULL THEN
        DELETE FROM material_qr_codes WHERE purchase_order_id = order2_id;
        GET DIAGNOSTICS deleted_qr_codes = ROW_COUNT;
        RAISE NOTICE 'Deleted % QR codes for order 2', deleted_qr_codes;
    END IF;
    
    -- Delete delivery_requests linked to these orders
    IF order1_id IS NOT NULL THEN
        DELETE FROM delivery_requests WHERE purchase_order_id = order1_id;
        GET DIAGNOSTICS deleted_delivery_requests = ROW_COUNT;
        RAISE NOTICE 'Deleted % delivery requests for order 1', deleted_delivery_requests;
    END IF;
    
    IF order2_id IS NOT NULL THEN
        DELETE FROM delivery_requests WHERE purchase_order_id = order2_id;
        GET DIAGNOSTICS deleted_delivery_requests = ROW_COUNT;
        RAISE NOTICE 'Deleted % delivery requests for order 2', deleted_delivery_requests;
    END IF;
    
    -- Delete material_items linked to these orders (if table exists)
    BEGIN
        IF order1_id IS NOT NULL THEN
            DELETE FROM material_items WHERE purchase_order_id = order1_id;
            GET DIAGNOSTICS deleted_material_items = ROW_COUNT;
            RAISE NOTICE 'Deleted % material items for order 1', deleted_material_items;
        END IF;
        
        IF order2_id IS NOT NULL THEN
            DELETE FROM material_items WHERE purchase_order_id = order2_id;
            GET DIAGNOSTICS deleted_material_items = ROW_COUNT;
            RAISE NOTICE 'Deleted % material items for order 2', deleted_material_items;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'material_items table does not exist, skipping';
    END;
    
    -- Delete tracking_numbers linked to these orders (if table exists)
    BEGIN
        IF order1_id IS NOT NULL THEN
            DELETE FROM tracking_numbers WHERE purchase_order_id = order1_id;
            RAISE NOTICE 'Deleted tracking numbers for order 1';
        END IF;
        
        IF order2_id IS NOT NULL THEN
            DELETE FROM tracking_numbers WHERE purchase_order_id = order2_id;
            RAISE NOTICE 'Deleted tracking numbers for order 2';
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'tracking_numbers table does not exist, skipping';
    END;
    
    -- Delete delivery_tracking linked to these orders (if table exists)
    BEGIN
        IF order1_id IS NOT NULL THEN
            DELETE FROM delivery_tracking WHERE delivery_id IN (
                SELECT id FROM delivery_requests WHERE purchase_order_id = order1_id
            );
            RAISE NOTICE 'Deleted delivery tracking for order 1';
        END IF;
        
        IF order2_id IS NOT NULL THEN
            DELETE FROM delivery_tracking WHERE delivery_id IN (
                SELECT id FROM delivery_requests WHERE purchase_order_id = order2_id
            );
            RAISE NOTICE 'Deleted delivery tracking for order 2';
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'delivery_tracking table does not exist, skipping';
    END;
    
    -- Finally, delete the purchase orders themselves
    IF order1_id IS NOT NULL THEN
        DELETE FROM purchase_orders WHERE id = order1_id;
        GET DIAGNOSTICS deleted_orders = ROW_COUNT;
        RAISE NOTICE 'Deleted purchase order 1: %', deleted_orders;
    END IF;
    
    IF order2_id IS NOT NULL THEN
        DELETE FROM purchase_orders WHERE id = order2_id;
        GET DIAGNOSTICS deleted_orders = ROW_COUNT;
        RAISE NOTICE 'Deleted purchase order 2: %', deleted_orders;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '========================================';
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting orders: %', SQLERRM;
END $$;
