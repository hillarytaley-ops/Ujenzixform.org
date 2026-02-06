-- =====================================================================
-- VERIFY QUOTE ACCEPTANCE FLOW
-- Run this to check that QR codes are generated when quotes are accepted
-- =====================================================================

-- 1. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'purchase_orders'
AND trigger_name LIKE '%qr%';

-- 2. Check if the QR code generation function exists
SELECT 
    proname as function_name,
    prosrc IS NOT NULL as has_body
FROM pg_proc
WHERE proname LIKE '%qr%' OR proname LIKE '%generate%qr%';

-- 3. Check recent confirmed orders and their QR code status
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.qr_code_generated,
    po.created_at,
    COUNT(mi.id) as material_items_count
FROM purchase_orders po
LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
WHERE po.status = 'confirmed'
AND po.created_at > NOW() - INTERVAL '7 days'
GROUP BY po.id, po.po_number, po.status, po.qr_code_generated, po.created_at
ORDER BY po.created_at DESC
LIMIT 10;

-- 4. Check if there are any confirmed orders WITHOUT QR codes
SELECT 
    po.id,
    po.po_number,
    po.status,
    po.qr_code_generated,
    po.delivery_required,
    po.created_at
FROM purchase_orders po
WHERE po.status = 'confirmed'
AND (po.qr_code_generated IS NULL OR po.qr_code_generated = false)
AND (po.delivery_required IS NULL OR po.delivery_required = true)
ORDER BY po.created_at DESC
LIMIT 10;

-- 5. If there are orders missing QR codes, manually generate them
-- (Uncomment to run)
/*
DO $$
DECLARE
    v_order RECORD;
    v_result JSONB;
BEGIN
    FOR v_order IN 
        SELECT id, po_number
        FROM purchase_orders
        WHERE status = 'confirmed'
        AND (qr_code_generated IS NULL OR qr_code_generated = false)
        AND (delivery_required IS NULL OR delivery_required = true)
    LOOP
        RAISE NOTICE 'Generating QR codes for: %', v_order.po_number;
        v_result := public.generate_individual_qr_codes_for_order(v_order.id);
        RAISE NOTICE 'Result: %', v_result;
    END LOOP;
END;
$$;
*/
