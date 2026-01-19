-- =====================================================================
-- INSERT TEST QR CODES - CORRECTED VERSION
-- Supplier: mamaethan@gmail.com (dispatchable QR codes)
-- Builder: kosgeihill@gmail.com (receivable QR codes)
-- =====================================================================

-- STEP 1: Drop the QR-related triggers
DROP TRIGGER IF EXISTS generate_qr_on_purchase_order_insert ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_codes ON public.purchase_orders;

-- STEP 2: Clean up previous test data
DELETE FROM public.material_items WHERE qr_code LIKE 'UJP-%TEST%' OR qr_code LIKE 'UJP-%-S00%';
DELETE FROM public.purchase_orders WHERE po_number LIKE 'PO-TEST-%';

-- STEP 3: Insert test data with proper supplier-builder relationship
DO $$
DECLARE
    supplier_user_id UUID;
    builder_user_id UUID;
    po_id1 UUID := gen_random_uuid();
    po_id2 UUID := gen_random_uuid();
    po_id3 UUID := gen_random_uuid();
BEGIN
    -- Get supplier ID (mamaethan@gmail.com)
    SELECT id INTO supplier_user_id FROM auth.users WHERE email = 'mamaethan@gmail.com';
    
    -- Get builder ID (kosgeihill@gmail.com) - THIS IS THE PROFESSIONAL BUILDER
    SELECT id INTO builder_user_id FROM auth.users WHERE email = 'kosgeihill@gmail.com';

    RAISE NOTICE '📦 Supplier (mamaethan@gmail.com): %', supplier_user_id;
    RAISE NOTICE '🏗️ Builder (kosgeihill@gmail.com): %', builder_user_id;

    IF supplier_user_id IS NULL THEN
        RAISE EXCEPTION 'Supplier mamaethan@gmail.com not found!';
    END IF;
    
    IF builder_user_id IS NULL THEN
        RAISE EXCEPTION 'Builder kosgeihill@gmail.com not found!';
    END IF;

    -- =====================================================================
    -- PO 1: Cement & Steel - Ready for Dispatch (pending status)
    -- =====================================================================
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id1,
        'PO-TEST-20260119-B001',
        builder_user_id,
        supplier_user_id,
        125000,
        'Nairobi, Kenya - Kosgei Construction Site Alpha',
        CURRENT_DATE + 7,
        'confirmed',
        '[
            {"name": "Portland Cement 50kg", "quantity": 100, "unit": "bags", "unit_price": 750, "total": 75000},
            {"name": "Steel Bars 12mm", "quantity": 50, "unit": "pieces", "unit_price": 1000, "total": 50000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 1 - PENDING (ready for supplier to dispatch)
    INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
    VALUES 
        (po_id1, 'UJP-CEMENT-B001-20260119-0001', 1, 'Portland Cement 50kg', 'CEMENT', 100, 'bags', supplier_user_id, 'pending'),
        (po_id1, 'UJP-STEEL-B001-20260119-0002', 2, 'Steel Bars 12mm', 'STEEL', 50, 'pieces', supplier_user_id, 'pending');
    
    RAISE NOTICE '✅ Created PO 1 with 2 QR codes (pending - ready for dispatch)';

    -- =====================================================================
    -- PO 2: Blocks & Sand - Already Dispatched (in transit)
    -- =====================================================================
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id2,
        'PO-TEST-20260119-B002',
        builder_user_id,
        supplier_user_id,
        85000,
        'Nairobi, Kenya - Kosgei Construction Site Beta',
        CURRENT_DATE + 3,
        'confirmed',
        '[
            {"name": "Concrete Blocks 6inch", "quantity": 500, "unit": "pieces", "unit_price": 120, "total": 60000},
            {"name": "River Sand", "quantity": 10, "unit": "tonnes", "unit_price": 2500, "total": 25000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 2 - DISPATCHED (in transit to builder)
    INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
    VALUES 
        (po_id2, 'UJP-BLOCKS-B002-20260119-0001', 1, 'Concrete Blocks 6inch', 'BLOCKS', 500, 'pieces', supplier_user_id, 'dispatched'),
        (po_id2, 'UJP-SAND-B002-20260119-0002', 2, 'River Sand', 'SAND', 10, 'tonnes', supplier_user_id, 'in_transit');
    
    RAISE NOTICE '✅ Created PO 2 with 2 QR codes (dispatched/in_transit - ready for builder to receive)';

    -- =====================================================================
    -- PO 3: Iron Sheets & Timber - Mixed statuses for testing
    -- =====================================================================
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id3,
        'PO-TEST-20260119-B003',
        builder_user_id,
        supplier_user_id,
        180000,
        'Nairobi, Kenya - Kosgei Construction Site Gamma',
        CURRENT_DATE + 5,
        'confirmed',
        '[
            {"name": "Iron Sheets Gauge 30", "quantity": 100, "unit": "pieces", "unit_price": 1200, "total": 120000},
            {"name": "Timber 2x4", "quantity": 200, "unit": "pieces", "unit_price": 300, "total": 60000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 3 - Mixed statuses
    INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
    VALUES 
        (po_id3, 'UJP-IRON-B003-20260119-0001', 1, 'Iron Sheets Gauge 30', 'IRON', 100, 'pieces', supplier_user_id, 'pending'),
        (po_id3, 'UJP-TIMBER-B003-20260119-0002', 2, 'Timber 2x4', 'TIMBER', 200, 'pieces', supplier_user_id, 'received');
    
    RAISE NOTICE '✅ Created PO 3 with 2 QR codes (pending + received)';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TEST DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📦 SUPPLIER DASHBOARD (mamaethan@gmail.com):';
    RAISE NOTICE '   - 3 QR codes with status "pending" ready to DISPATCH';
    RAISE NOTICE '   - 2 QR codes already dispatched/in_transit';
    RAISE NOTICE '';
    RAISE NOTICE '🏗️ BUILDER DASHBOARD (kosgeihill@gmail.com):';
    RAISE NOTICE '   - 3 Purchase Orders visible in Orders tab';
    RAISE NOTICE '   - 6 QR code images with tracking status';
    RAISE NOTICE '   - 2 QR codes ready to RECEIVE (dispatched/in_transit)';
    RAISE NOTICE '   - 1 QR code already received';
    RAISE NOTICE '';
END $$;

-- STEP 4: Recreate triggers only if their functions exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_item_qr_codes') THEN
        CREATE TRIGGER trigger_auto_generate_item_qr_codes
            BEFORE INSERT OR UPDATE ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_generate_item_qr_codes();
        RAISE NOTICE 'Recreated trigger_auto_generate_item_qr_codes';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_qr_codes_for_purchase_order') THEN
        CREATE TRIGGER trigger_auto_generate_qr_codes
            AFTER UPDATE ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_generate_qr_codes_for_purchase_order();
        RAISE NOTICE 'Recreated trigger_auto_generate_qr_codes';
    END IF;
END $$;

-- STEP 5: Show results
SELECT 
    '📦 Purchase Orders for kosgeihill@gmail.com' as category,
    COUNT(*) as count 
FROM public.purchase_orders po
JOIN auth.users u ON po.buyer_id = u.id
WHERE po.po_number LIKE 'PO-TEST-%-B%' AND u.email = 'kosgeihill@gmail.com'

UNION ALL

SELECT 
    '🏷️ QR Codes (Total)' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%'

UNION ALL

SELECT 
    '📤 Dispatchable (pending)' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status = 'pending'

UNION ALL

SELECT 
    '📥 Receivable (dispatched/in_transit)' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status IN ('dispatched', 'in_transit')

UNION ALL

SELECT 
    '✅ Already Received' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status = 'received';

