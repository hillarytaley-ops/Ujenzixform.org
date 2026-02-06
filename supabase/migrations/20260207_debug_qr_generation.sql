-- =====================================================================
-- DEBUG QR CODE GENERATION FOR RECENT ORDERS
-- =====================================================================

-- Step 1: Check the trigger exists and is enabled
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgtype
FROM pg_trigger 
WHERE tgname LIKE '%qr%' OR tgname LIKE '%confirm%';

-- Step 2: Check recent confirmed orders and their QR code status
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.qr_code_generated,
    po.created_at,
    po.updated_at,
    (SELECT COUNT(*) FROM material_items mi WHERE mi.purchase_order_id = po.id) as material_items_count
FROM purchase_orders po
WHERE po.created_at > NOW() - INTERVAL '2 days'
ORDER BY po.created_at DESC
LIMIT 20;

-- Step 3: Check if there are any confirmed orders WITHOUT QR codes
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.qr_code_generated,
    po.items,
    po.created_at
FROM purchase_orders po
WHERE po.status = 'confirmed'
  AND (po.qr_code_generated IS NULL OR po.qr_code_generated = false)
ORDER BY po.created_at DESC
LIMIT 10;

-- Step 4: Manually generate QR codes for any confirmed orders missing them
DO $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking for confirmed orders without QR codes...';
    
    FOR v_order IN 
        SELECT po.id, po.po_number, po.status, po.qr_code_generated
        FROM public.purchase_orders po
        WHERE po.status = 'confirmed'
          AND (po.qr_code_generated IS NULL OR po.qr_code_generated = false)
        ORDER BY po.created_at DESC
    LOOP
        RAISE NOTICE 'Generating QR codes for order: % (%) - status: %, qr_generated: %', 
            v_order.po_number, v_order.id, v_order.status, v_order.qr_code_generated;
        
        -- Generate QR codes
        v_result := public.generate_individual_qr_codes_for_order(v_order.id);
        
        IF (v_result->>'success')::BOOLEAN THEN
            v_count := v_count + 1;
            RAISE NOTICE '  ✓ Generated % QR codes', v_result->>'total_qr_codes_created';
        ELSE
            RAISE NOTICE '  ✗ Failed: %', v_result->>'error';
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Done! Generated QR codes for % orders.', v_count;
END;
$$;

-- Step 5: Verify QR codes were generated
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.qr_code_generated,
    (SELECT COUNT(*) FROM material_items mi WHERE mi.purchase_order_id = po.id) as qr_codes_count,
    po.created_at
FROM purchase_orders po
WHERE po.status = 'confirmed'
AND po.created_at > NOW() - INTERVAL '2 days'
ORDER BY po.created_at DESC;
