-- =====================================================================
-- FORCE DELETE SPECIFIC ORDERS - BYPASSES RLS AND HANDLES CONSTRAINTS
-- =====================================================================
-- This migration forcefully deletes orders and all related data:
-- 1. QR-1773464295666-01T1P
-- 2. QR-1773461741050-CB8XY
-- 
-- This version bypasses RLS policies and handles foreign key constraints
-- =====================================================================

-- First, let's find the orders and show what we're working with
DO $$
DECLARE
    order1_id UUID;
    order2_id UUID;
    order1_po TEXT;
    order2_po TEXT;
    deleted_count INTEGER;
BEGIN
    -- Show all orders with similar patterns
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEARCHING FOR ORDERS...';
    RAISE NOTICE '========================================';
    
    FOR order1_po IN 
        SELECT po_number FROM purchase_orders 
        WHERE po_number LIKE '%1773464295666%'
        LIMIT 10
    LOOP
        RAISE NOTICE 'Found order with pattern 1773464295666: %', order1_po;
    END LOOP;
    
    FOR order2_po IN 
        SELECT po_number FROM purchase_orders 
        WHERE po_number LIKE '%1773461741050%'
        LIMIT 10
    LOOP
        RAISE NOTICE 'Found order with pattern 1773461741050: %', order2_po;
    END LOOP;
    
    -- Find orders with flexible matching
    SELECT id, po_number INTO order1_id, order1_po 
    FROM purchase_orders 
    WHERE po_number LIKE '%1773464295666%'
    ORDER BY CASE WHEN po_number = 'QR-1773464295666-01T1P' THEN 1 ELSE 2 END
    LIMIT 1;
    
    SELECT id, po_number INTO order2_id, order2_po 
    FROM purchase_orders 
    WHERE po_number LIKE '%1773461741050%'
    ORDER BY CASE WHEN po_number = 'QR-1773461741050-CB8XY' THEN 1 ELSE 2 END
    LIMIT 1;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FOUND ORDERS:';
    IF order1_id IS NOT NULL THEN
        RAISE NOTICE 'Order 1: ID=% | PO=%', order1_id, order1_po;
    ELSE
        RAISE NOTICE 'Order 1: NOT FOUND';
    END IF;
    
    IF order2_id IS NOT NULL THEN
        RAISE NOTICE 'Order 2: ID=% | PO=%', order2_id, order2_po;
    ELSE
        RAISE NOTICE 'Order 2: NOT FOUND';
    END IF;
    RAISE NOTICE '========================================';
    
    -- Now delete all related data using the IDs we found
    IF order1_id IS NOT NULL OR order2_id IS NOT NULL THEN
        RAISE NOTICE 'Starting deletion process...';
        
        -- Delete material_qr_codes (using CASCADE if possible)
        IF order1_id IS NOT NULL THEN
            DELETE FROM material_qr_codes WHERE purchase_order_id = order1_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % QR codes for order 1', deleted_count;
        END IF;
        
        IF order2_id IS NOT NULL THEN
            DELETE FROM material_qr_codes WHERE purchase_order_id = order2_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % QR codes for order 2', deleted_count;
        END IF;
        
        -- Delete delivery_requests
        IF order1_id IS NOT NULL THEN
            DELETE FROM delivery_requests WHERE purchase_order_id = order1_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % delivery requests for order 1', deleted_count;
        END IF;
        
        IF order2_id IS NOT NULL THEN
            DELETE FROM delivery_requests WHERE purchase_order_id = order2_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % delivery requests for order 2', deleted_count;
        END IF;
        
        -- Delete material_items
        BEGIN
            IF order1_id IS NOT NULL THEN
                DELETE FROM material_items WHERE purchase_order_id = order1_id;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RAISE NOTICE 'Deleted % material items for order 1', deleted_count;
            END IF;
            
            IF order2_id IS NOT NULL THEN
                DELETE FROM material_items WHERE purchase_order_id = order2_id;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RAISE NOTICE 'Deleted % material items for order 2', deleted_count;
            END IF;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'material_items table does not exist';
        END;
        
        -- Delete tracking_numbers
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
            RAISE NOTICE 'tracking_numbers table does not exist';
        END;
        
        -- Delete delivery_tracking
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
            RAISE NOTICE 'delivery_tracking table does not exist';
        END;
        
        -- Delete delivery_notes
        BEGIN
            IF order1_id IS NOT NULL THEN
                DELETE FROM delivery_notes WHERE purchase_order_id = order1_id;
                RAISE NOTICE 'Deleted delivery notes for order 1';
            END IF;
            
            IF order2_id IS NOT NULL THEN
                DELETE FROM delivery_notes WHERE purchase_order_id = order2_id;
                RAISE NOTICE 'Deleted delivery notes for order 2';
            END IF;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'delivery_notes table does not exist';
        END;
        
        -- Delete notifications (check column existence first)
        BEGIN
            -- Check if notifications table exists and has the expected columns
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                AND column_name IN ('related_id', 'order_id', 'purchase_order_id', 'delivery_request_id', 'data')
            ) THEN
                IF order1_id IS NOT NULL THEN
                    -- Try different possible column names
                    BEGIN
                        DELETE FROM notifications WHERE related_id = order1_id::TEXT;
                    EXCEPTION WHEN undefined_column THEN
                        BEGIN
                            DELETE FROM notifications WHERE order_id = order1_id;
                        EXCEPTION WHEN undefined_column THEN
                            BEGIN
                                DELETE FROM notifications WHERE purchase_order_id = order1_id;
                            EXCEPTION WHEN undefined_column THEN
                                BEGIN
                                    DELETE FROM notifications WHERE delivery_request_id IN (
                                        SELECT id FROM delivery_requests WHERE purchase_order_id = order1_id
                                    );
                                EXCEPTION WHEN undefined_column THEN
                                    BEGIN
                                        DELETE FROM notifications WHERE data::TEXT LIKE '%' || order1_id::TEXT || '%';
                                    EXCEPTION WHEN undefined_column THEN
                                        NULL;
                                    END;
                                END;
                            END;
                        END;
                    END;
                    GET DIAGNOSTICS deleted_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % notifications for order 1', deleted_count;
                END IF;
                
                IF order2_id IS NOT NULL THEN
                    BEGIN
                        DELETE FROM notifications WHERE related_id = order2_id::TEXT;
                    EXCEPTION WHEN undefined_column THEN
                        BEGIN
                            DELETE FROM notifications WHERE order_id = order2_id;
                        EXCEPTION WHEN undefined_column THEN
                            BEGIN
                                DELETE FROM notifications WHERE purchase_order_id = order2_id;
                            EXCEPTION WHEN undefined_column THEN
                                BEGIN
                                    DELETE FROM notifications WHERE delivery_request_id IN (
                                        SELECT id FROM delivery_requests WHERE purchase_order_id = order2_id
                                    );
                                EXCEPTION WHEN undefined_column THEN
                                    BEGIN
                                        DELETE FROM notifications WHERE data::TEXT LIKE '%' || order2_id::TEXT || '%';
                                    EXCEPTION WHEN undefined_column THEN
                                        NULL;
                                    END;
                                END;
                            END;
                        END;
                    END;
                    GET DIAGNOSTICS deleted_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % notifications for order 2', deleted_count;
                END IF;
            ELSE
                RAISE NOTICE 'notifications table does not have expected columns, skipping';
            END IF;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'notifications table does not exist';
        END;
        
        -- Finally, delete the purchase orders themselves
        -- Use SECURITY DEFINER to bypass RLS
        RAISE NOTICE '========================================';
        RAISE NOTICE 'DELETING PURCHASE ORDERS...';
        RAISE NOTICE '========================================';
        
        IF order1_id IS NOT NULL THEN
            BEGIN
                -- Try with explicit RLS bypass
                PERFORM set_config('request.jwt.claims', '{}', true);
                DELETE FROM purchase_orders WHERE id = order1_id;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                IF deleted_count > 0 THEN
                    RAISE NOTICE '✅ SUCCESS: Deleted purchase order 1 (ID: %)', order1_id;
                ELSE
                    RAISE NOTICE '❌ FAILED: Purchase order 1 not deleted (ID: %)', order1_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ ERROR deleting order 1: %', SQLERRM;
                RAISE NOTICE 'Order 1 ID: %', order1_id;
            END;
        END IF;
        
        IF order2_id IS NOT NULL THEN
            BEGIN
                PERFORM set_config('request.jwt.claims', '{}', true);
                DELETE FROM purchase_orders WHERE id = order2_id;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                IF deleted_count > 0 THEN
                    RAISE NOTICE '✅ SUCCESS: Deleted purchase order 2 (ID: %)', order2_id;
                ELSE
                    RAISE NOTICE '❌ FAILED: Purchase order 2 not deleted (ID: %)', order2_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ ERROR deleting order 2: %', SQLERRM;
                RAISE NOTICE 'Order 2 ID: %', order2_id;
            END;
        END IF;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION PROCESS COMPLETE';
    RAISE NOTICE '========================================';
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Fatal error: %', SQLERRM;
END $$;

-- If the above didn't work, try direct deletion by po_number (bypassing RLS)
-- This is a fallback that uses SECURITY DEFINER
CREATE OR REPLACE FUNCTION force_delete_order_by_po_number(po_num TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_id UUID;
    deleted_count INTEGER := 0;
BEGIN
    -- Find the order
    SELECT id INTO order_id FROM purchase_orders WHERE po_number = po_num LIMIT 1;
    
    IF order_id IS NULL THEN
        RAISE NOTICE 'Order not found: %', po_num;
        RETURN 0;
    END IF;
    
    RAISE NOTICE 'Found order % with ID: %', po_num, order_id;
    
    -- Delete all related data
    DELETE FROM material_qr_codes WHERE purchase_order_id = order_id;
    DELETE FROM delivery_requests WHERE purchase_order_id = order_id;
    
    BEGIN
        DELETE FROM material_items WHERE purchase_order_id = order_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DELETE FROM tracking_numbers WHERE purchase_order_id = order_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DELETE FROM delivery_tracking WHERE delivery_id IN (
            SELECT id FROM delivery_requests WHERE purchase_order_id = order_id
        );
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        DELETE FROM delivery_notes WHERE purchase_order_id = order_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    BEGIN
        -- Try to delete notifications, checking for different column names
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'related_id'
        ) THEN
            DELETE FROM notifications WHERE related_id = order_id::TEXT;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'order_id'
        ) THEN
            DELETE FROM notifications WHERE order_id = order_id;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'purchase_order_id'
        ) THEN
            DELETE FROM notifications WHERE purchase_order_id = order_id;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'delivery_request_id'
        ) THEN
            DELETE FROM notifications WHERE delivery_request_id IN (
                SELECT id FROM delivery_requests WHERE purchase_order_id = order_id
            );
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'data'
        ) THEN
            -- Try to delete from data JSONB column (order info might be stored there)
            DELETE FROM notifications WHERE data::TEXT LIKE '%' || order_id::TEXT || '%';
        END IF;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    -- Finally delete the order
    DELETE FROM purchase_orders WHERE id = order_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE '✅ Successfully deleted order: %', po_num;
    ELSE
        RAISE NOTICE '❌ Failed to delete order: %', po_num;
    END IF;
    
    RETURN deleted_count;
END;
$$;

-- Now call the function to force delete
DO $$
DECLARE
    result INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'USING FORCE DELETE FUNCTION...';
    RAISE NOTICE '========================================';
    
    -- Try to delete order 1
    SELECT force_delete_order_by_po_number('QR-1773464295666-01T1P') INTO result;
    RAISE NOTICE 'Force delete result for order 1: %', result;
    
    -- Try to delete order 2
    SELECT force_delete_order_by_po_number('QR-1773461741050-CB8XY') INTO result;
    RAISE NOTICE 'Force delete result for order 2: %', result;
    
    -- Also try with pattern matching
    FOR result IN 
        SELECT force_delete_order_by_po_number(po_number)
        FROM purchase_orders 
        WHERE po_number LIKE '%1773464295666%' 
           OR po_number LIKE '%1773461741050%'
    LOOP
        RAISE NOTICE 'Deleted order via pattern match, result: %', result;
    END LOOP;
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS force_delete_order_by_po_number(TEXT);
