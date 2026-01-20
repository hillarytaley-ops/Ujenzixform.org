-- =====================================================================
-- INSERT ENHANCED TEST QR CODES WITH CLIENT IDENTITY
-- Supplier: mamaethan@gmail.com (dispatchable QR codes)
-- Builder: kosgeihill@gmail.com (receivable QR codes)
-- =====================================================================
-- This migration creates test QR codes with the new enhanced format:
-- - Unique QR code per item with client identity
-- - Buyer info embedded (name, email, phone)
-- - One-time scan tracking fields
-- =====================================================================

-- STEP 0: Disable triggers on suppliers table
DO $$
DECLARE
    trig RECORD;
BEGIN
    RAISE NOTICE 'Disabling all triggers on suppliers table...';
    FOR trig IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'public.suppliers'::regclass 
        AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.suppliers', trig.tgname);
        RAISE NOTICE 'Dropped trigger: %', trig.tgname;
    END LOOP;
END $$;

-- STEP 1: Drop the QR-related triggers to prevent conflicts
DROP TRIGGER IF EXISTS generate_qr_on_purchase_order_insert ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_codes ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON public.purchase_orders;

-- STEP 2: Clean up previous test data (order matters due to foreign keys!)
-- First, clear the scan references from material_items
UPDATE public.material_items 
SET dispatch_scan_id = NULL, receiving_scan_id = NULL 
WHERE qr_code LIKE 'UJP-%';

-- Now delete in correct order (child tables first)
DELETE FROM public.qr_scan_events WHERE qr_code LIKE 'UJP-%';
DELETE FROM public.material_items WHERE qr_code LIKE 'UJP-%';
DELETE FROM public.purchase_orders WHERE po_number LIKE 'PO-TEST-%' OR po_number LIKE 'PO-ENH-%';

-- STEP 3: Insert test data with enhanced QR codes including client identity
DO $$
DECLARE
    supplier_user_id UUID;
    supplier_record_id UUID;
    builder_user_id UUID;
    builder_name TEXT;
    builder_email TEXT;
    builder_phone TEXT;
    po_id1 UUID := gen_random_uuid();
    po_id2 UUID := gen_random_uuid();
    po_id3 UUID := gen_random_uuid();
    po_id4 UUID := gen_random_uuid();
    timestamp_code TEXT;
    supplier_code TEXT;
    buyer_code TEXT;
BEGIN
    -- Get supplier info
    SELECT id INTO supplier_user_id FROM auth.users WHERE email = 'mamaethan@gmail.com';
    SELECT id INTO supplier_record_id FROM public.suppliers WHERE user_id = supplier_user_id OR email = 'mamaethan@gmail.com';
    
    -- Get builder info (kosgeihill@gmail.com)
    SELECT id INTO builder_user_id FROM auth.users WHERE email = 'kosgeihill@gmail.com';
    
    -- Get builder profile info
    SELECT 
        COALESCE(p.full_name, p.company_name, 'Hillary Kosgei') as name,
        'kosgeihill@gmail.com' as email,
        COALESCE(p.phone, '+254712345678') as phone
    INTO builder_name, builder_email, builder_phone
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = builder_user_id;

    -- Generate codes for QR format
    timestamp_code := TO_CHAR(NOW(), 'YYMMDDHH24MISS');
    supplier_code := UPPER(SUBSTRING(supplier_record_id::TEXT FROM 1 FOR 4));
    buyer_code := UPPER(SUBSTRING(builder_user_id::TEXT FROM 1 FOR 4));

    RAISE NOTICE '========================================';
    RAISE NOTICE '📦 SUPPLIER INFO:';
    RAISE NOTICE '   Email: mamaethan@gmail.com';
    RAISE NOTICE '   User ID: %', supplier_user_id;
    RAISE NOTICE '   Supplier Record ID: %', supplier_record_id;
    RAISE NOTICE '   Supplier Code: %', supplier_code;
    RAISE NOTICE '';
    RAISE NOTICE '🏗️ BUILDER INFO:';
    RAISE NOTICE '   Email: kosgeihill@gmail.com';
    RAISE NOTICE '   User ID: %', builder_user_id;
    RAISE NOTICE '   Name: %', builder_name;
    RAISE NOTICE '   Buyer Code: %', buyer_code;
    RAISE NOTICE '========================================';

    IF supplier_user_id IS NULL THEN
        RAISE EXCEPTION 'Supplier user mamaethan@gmail.com not found!';
    END IF;
    
    IF builder_user_id IS NULL THEN
        RAISE EXCEPTION 'Builder kosgeihill@gmail.com not found!';
    END IF;

    -- If no supplier record, try to find or create one
    IF supplier_record_id IS NULL THEN
        SELECT id INTO supplier_record_id FROM public.suppliers WHERE email = 'mamaethan@gmail.com';
    END IF;

    IF supplier_record_id IS NULL THEN
        RAISE NOTICE '⚠️ Creating supplier record for mamaethan@gmail.com';
        INSERT INTO public.suppliers (id, user_id, company_name, email, phone, location, status)
        VALUES (
            gen_random_uuid(),
            supplier_user_id,
            'Mama Ethan Supplies',
            'mamaethan@gmail.com',
            '+254700000000',
            'Nairobi, Kenya',
            'active'
        )
        RETURNING id INTO supplier_record_id;
        
        supplier_code := UPPER(SUBSTRING(supplier_record_id::TEXT FROM 1 FOR 4));
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- PURCHASE ORDER 1: Construction Materials (3 items - PENDING)
    -- ═══════════════════════════════════════════════════════════════════════════
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id1,
        'PO-ENH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
        builder_user_id,
        supplier_record_id,
        185000,
        'Westlands, Nairobi - Site Alpha',
        CURRENT_DATE + INTERVAL '5 days',
        'confirmed',
        '[
            {"name": "Portland Cement 50kg", "category": "Cement", "quantity": 100, "unit": "bags", "unit_price": 750, "total": 75000},
            {"name": "Steel Bars Y12 (12m)", "category": "Steel", "quantity": 50, "unit": "pieces", "unit_price": 1200, "total": 60000},
            {"name": "River Sand", "category": "Sand", "quantity": 20, "unit": "tonnes", "unit_price": 2500, "total": 50000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 1 - PENDING (ready for supplier to dispatch)
    INSERT INTO public.material_items (
        purchase_order_id, qr_code, item_sequence, material_type, category, 
        quantity, unit, supplier_id, status,
        buyer_id, buyer_name, buyer_email, buyer_phone,
        item_unit_price, item_total_price,
        dispatch_scanned, receive_scanned,
        qr_code_generated_at
    ) VALUES 
        (po_id1, 'UJP-' || supplier_code || '-' || buyer_code || '-CEM-' || timestamp_code || '-0001-A1B2C3', 
         1, 'Portland Cement 50kg', 'Cement', 100, 'bags', supplier_record_id, 'pending',
         builder_user_id, builder_name, builder_email, builder_phone,
         750, 75000, false, false, NOW()),
        (po_id1, 'UJP-' || supplier_code || '-' || buyer_code || '-STE-' || timestamp_code || '-0002-D4E5F6', 
         2, 'Steel Bars Y12 (12m)', 'Steel', 50, 'pieces', supplier_record_id, 'pending',
         builder_user_id, builder_name, builder_email, builder_phone,
         1200, 60000, false, false, NOW()),
        (po_id1, 'UJP-' || supplier_code || '-' || buyer_code || '-SAN-' || timestamp_code || '-0003-G7H8I9', 
         3, 'River Sand', 'Sand', 20, 'tonnes', supplier_record_id, 'pending',
         builder_user_id, builder_name, builder_email, builder_phone,
         2500, 50000, false, false, NOW());
    
    RAISE NOTICE '✅ Created PO 1 with 3 QR codes (PENDING - ready for dispatch)';

    -- ═══════════════════════════════════════════════════════════════════════════
    -- PURCHASE ORDER 2: Roofing Materials (2 items - DISPATCHED)
    -- ═══════════════════════════════════════════════════════════════════════════
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id2,
        'PO-ENH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
        builder_user_id,
        supplier_record_id,
        125000,
        'Karen, Nairobi - Site Beta',
        CURRENT_DATE + INTERVAL '3 days',
        'confirmed',
        '[
            {"name": "Iron Sheets Gauge 30", "category": "Roofing", "quantity": 100, "unit": "pieces", "unit_price": 850, "total": 85000},
            {"name": "Roofing Nails 3 inch", "category": "Hardware", "quantity": 50, "unit": "kg", "unit_price": 800, "total": 40000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 2 - DISPATCHED (supplier has scanned, in transit)
    INSERT INTO public.material_items (
        purchase_order_id, qr_code, item_sequence, material_type, category, 
        quantity, unit, supplier_id, status,
        buyer_id, buyer_name, buyer_email, buyer_phone,
        item_unit_price, item_total_price,
        dispatch_scanned, dispatch_scanned_at, dispatch_scanned_by,
        receive_scanned,
        qr_code_generated_at
    ) VALUES 
        (po_id2, 'UJP-' || supplier_code || '-' || buyer_code || '-ROO-' || timestamp_code || '-0001-J1K2L3', 
         1, 'Iron Sheets Gauge 30', 'Roofing', 100, 'pieces', supplier_record_id, 'dispatched',
         builder_user_id, builder_name, builder_email, builder_phone,
         850, 85000, 
         true, NOW() - INTERVAL '2 hours', supplier_user_id,
         false, NOW() - INTERVAL '1 day'),
        (po_id2, 'UJP-' || supplier_code || '-' || buyer_code || '-HAR-' || timestamp_code || '-0002-M4N5O6', 
         2, 'Roofing Nails 3 inch', 'Hardware', 50, 'kg', supplier_record_id, 'in_transit',
         builder_user_id, builder_name, builder_email, builder_phone,
         800, 40000, 
         true, NOW() - INTERVAL '1 hour', supplier_user_id,
         false, NOW() - INTERVAL '1 day');
    
    RAISE NOTICE '✅ Created PO 2 with 2 QR codes (DISPATCHED - in transit to builder)';

    -- ═══════════════════════════════════════════════════════════════════════════
    -- PURCHASE ORDER 3: Finishing Materials (3 items - RECEIVED)
    -- ═══════════════════════════════════════════════════════════════════════════
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id3,
        'PO-ENH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
        builder_user_id,
        supplier_record_id,
        95000,
        'Lavington, Nairobi - Site Gamma',
        CURRENT_DATE - INTERVAL '2 days',
        'confirmed',
        '[
            {"name": "Crown Emulsion Paint (20L)", "category": "Paint", "quantity": 10, "unit": "buckets", "unit_price": 4500, "total": 45000},
            {"name": "Ceramic Floor Tiles 60x60", "category": "Tiles", "quantity": 50, "unit": "boxes", "unit_price": 800, "total": 40000},
            {"name": "Tile Adhesive 25kg", "category": "Adhesives", "quantity": 20, "unit": "bags", "unit_price": 500, "total": 10000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 3 - RECEIVED (both dispatch and receive scanned)
    INSERT INTO public.material_items (
        purchase_order_id, qr_code, item_sequence, material_type, category, 
        quantity, unit, supplier_id, status,
        buyer_id, buyer_name, buyer_email, buyer_phone,
        item_unit_price, item_total_price,
        dispatch_scanned, dispatch_scanned_at, dispatch_scanned_by,
        receive_scanned, receive_scanned_at, receive_scanned_by,
        qr_code_generated_at
    ) VALUES 
        (po_id3, 'UJP-' || supplier_code || '-' || buyer_code || '-PAI-' || timestamp_code || '-0001-P7Q8R9', 
         1, 'Crown Emulsion Paint (20L)', 'Paint', 10, 'buckets', supplier_record_id, 'received',
         builder_user_id, builder_name, builder_email, builder_phone,
         4500, 45000, 
         true, NOW() - INTERVAL '3 days', supplier_user_id,
         true, NOW() - INTERVAL '2 days', builder_user_id,
         NOW() - INTERVAL '4 days'),
        (po_id3, 'UJP-' || supplier_code || '-' || buyer_code || '-TIL-' || timestamp_code || '-0002-S1T2U3', 
         2, 'Ceramic Floor Tiles 60x60', 'Tiles', 50, 'boxes', supplier_record_id, 'received',
         builder_user_id, builder_name, builder_email, builder_phone,
         800, 40000, 
         true, NOW() - INTERVAL '3 days', supplier_user_id,
         true, NOW() - INTERVAL '2 days', builder_user_id,
         NOW() - INTERVAL '4 days'),
        (po_id3, 'UJP-' || supplier_code || '-' || buyer_code || '-ADH-' || timestamp_code || '-0003-V4W5X6', 
         3, 'Tile Adhesive 25kg', 'Adhesives', 20, 'bags', supplier_record_id, 'received',
         builder_user_id, builder_name, builder_email, builder_phone,
         500, 10000, 
         true, NOW() - INTERVAL '3 days', supplier_user_id,
         true, NOW() - INTERVAL '2 days', builder_user_id,
         NOW() - INTERVAL '4 days');
    
    RAISE NOTICE '✅ Created PO 3 with 3 QR codes (RECEIVED - fully tracked)';

    -- ═══════════════════════════════════════════════════════════════════════════
    -- PURCHASE ORDER 4: Plumbing Materials (2 items - MIXED STATUS)
    -- ═══════════════════════════════════════════════════════════════════════════
    INSERT INTO public.purchase_orders (
        id, po_number, buyer_id, supplier_id, total_amount, 
        delivery_address, delivery_date, status, items, qr_code_generated
    ) VALUES (
        po_id4,
        'PO-ENH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004',
        builder_user_id,
        supplier_record_id,
        65000,
        'Kilimani, Nairobi - Site Delta',
        CURRENT_DATE + INTERVAL '1 day',
        'confirmed',
        '[
            {"name": "PVC Pipes 4 inch (6m)", "category": "Plumbing", "quantity": 30, "unit": "pieces", "unit_price": 1500, "total": 45000},
            {"name": "PVC Fittings Assorted", "category": "Plumbing", "quantity": 100, "unit": "pieces", "unit_price": 200, "total": 20000}
        ]'::jsonb,
        true
    );
    
    -- QR codes for PO 4 - MIXED (one dispatched, one pending)
    INSERT INTO public.material_items (
        purchase_order_id, qr_code, item_sequence, material_type, category, 
        quantity, unit, supplier_id, status,
        buyer_id, buyer_name, buyer_email, buyer_phone,
        item_unit_price, item_total_price,
        dispatch_scanned, dispatch_scanned_at, dispatch_scanned_by,
        receive_scanned,
        qr_code_generated_at
    ) VALUES 
        (po_id4, 'UJP-' || supplier_code || '-' || buyer_code || '-PLU-' || timestamp_code || '-0001-Y7Z8A9', 
         1, 'PVC Pipes 4 inch (6m)', 'Plumbing', 30, 'pieces', supplier_record_id, 'dispatched',
         builder_user_id, builder_name, builder_email, builder_phone,
         1500, 45000, 
         true, NOW() - INTERVAL '30 minutes', supplier_user_id,
         false, NOW() - INTERVAL '2 hours'),
        (po_id4, 'UJP-' || supplier_code || '-' || buyer_code || '-PLU-' || timestamp_code || '-0002-B1C2D3', 
         2, 'PVC Fittings Assorted', 'Plumbing', 100, 'pieces', supplier_record_id, 'pending',
         builder_user_id, builder_name, builder_email, builder_phone,
         200, 20000, 
         false, NULL, NULL,
         false, NOW() - INTERVAL '2 hours');
    
    RAISE NOTICE '✅ Created PO 4 with 2 QR codes (MIXED - one dispatched, one pending)';

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 SUMMARY OF CREATED TEST DATA:';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Purchase Orders: 4';
    RAISE NOTICE '   Total QR Codes: 10';
    RAISE NOTICE '   - Pending (ready for dispatch): 4';
    RAISE NOTICE '   - Dispatched (in transit): 3';
    RAISE NOTICE '   - Received (fully tracked): 3';
    RAISE NOTICE '';
    RAISE NOTICE '   Supplier: mamaethan@gmail.com';
    RAISE NOTICE '   Builder: kosgeihill@gmail.com';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- STEP 4: Recreate triggers (if they exist)
DO $$
BEGIN
    -- Only recreate if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_qr_codes_on_confirm') THEN
        DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON public.purchase_orders;
        CREATE TRIGGER trigger_auto_generate_qr_on_confirm
            AFTER UPDATE ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_generate_qr_codes_on_confirm();
        RAISE NOTICE '✅ Recreated trigger: trigger_auto_generate_qr_on_confirm';
    END IF;
END $$;

-- STEP 5: Verify the data
SELECT 
    'Purchase Orders' as category,
    COUNT(*)::TEXT as count
FROM public.purchase_orders 
WHERE po_number LIKE 'PO-ENH-%'

UNION ALL

SELECT 
    'Total QR Codes' as category,
    COUNT(*)::TEXT as count
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%'

UNION ALL

SELECT 
    'Pending Items' as category,
    COUNT(*)::TEXT as count
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%' AND status = 'pending'

UNION ALL

SELECT 
    'Dispatched Items' as category,
    COUNT(*)::TEXT as count
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%' AND (status = 'dispatched' OR status = 'in_transit')

UNION ALL

SELECT 
    'Received Items' as category,
    COUNT(*)::TEXT as count
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%' AND status = 'received'

UNION ALL

SELECT 
    'Items with Client Info' as category,
    COUNT(*)::TEXT as count
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%' AND buyer_name IS NOT NULL;

