-- =====================================================================
-- FIX QR CODE TRIGGER TO FIRE ON INSERT AND UPDATE
-- =====================================================================
-- The previous trigger only fired on UPDATE, but orders are created
-- with status='confirmed' directly on INSERT, so QR codes were never generated.
-- =====================================================================

-- Update the trigger function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.auto_generate_individual_qr_codes_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- For INSERT: Generate QR codes if status is 'confirmed'
    -- For UPDATE: Generate QR codes when status changes to 'confirmed'
    IF TG_OP = 'INSERT' THEN
        -- On INSERT, check if status is 'confirmed' and QR codes not generated
        IF NEW.status = 'confirmed' AND 
           (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = false) THEN
            PERFORM public.generate_individual_qr_codes_for_order(NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- On UPDATE, check if status changed to 'confirmed'
        IF NEW.status = 'confirmed' AND 
           (OLD.status IS NULL OR OLD.status != 'confirmed') AND
           (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = false) THEN
            PERFORM public.generate_individual_qr_codes_for_order(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_individual_qr_on_confirm ON public.purchase_orders;

-- Create new trigger that fires on BOTH INSERT AND UPDATE
CREATE TRIGGER trigger_auto_generate_individual_qr_on_confirm
    AFTER INSERT OR UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_individual_qr_codes_on_confirm();

-- =====================================================================
-- MANUALLY GENERATE QR CODES FOR EXISTING CONFIRMED ORDERS WITHOUT QR CODES
-- =====================================================================
-- This will generate QR codes for any orders that were created but missed
-- the trigger due to the previous bug.
DO $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking for confirmed orders without QR codes...';
    
    FOR v_order IN 
        SELECT po.id, po.po_number
        FROM public.purchase_orders po
        WHERE po.status = 'confirmed'
          AND (po.qr_code_generated IS NULL OR po.qr_code_generated = false)
          AND NOT EXISTS (
              SELECT 1 FROM public.material_items mi 
              WHERE mi.purchase_order_id = po.id
          )
        ORDER BY po.created_at DESC
    LOOP
        RAISE NOTICE 'Generating QR codes for order: % (%)', v_order.po_number, v_order.id;
        
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

-- =====================================================================
-- VERIFICATION QUERY (for debugging)
-- =====================================================================
-- Run this to see orders and their QR code status:
-- SELECT 
--     po.id,
--     po.po_number,
--     po.status,
--     po.qr_code_generated,
--     po.created_at,
--     COUNT(mi.id) as material_items_count
-- FROM purchase_orders po
-- LEFT JOIN material_items mi ON mi.purchase_order_id = po.id
-- WHERE po.created_at > NOW() - INTERVAL '7 days'
-- GROUP BY po.id, po.po_number, po.status, po.qr_code_generated, po.created_at
-- ORDER BY po.created_at DESC;
