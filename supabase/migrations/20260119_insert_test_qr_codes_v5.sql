-- =====================================================================
-- INSERT TEST QR CODES - VERSION 5 (DISABLE ALL TRIGGERS)
-- Supplier: mamaethan@gmail.com (dispatchable QR codes)
-- Builder: kosgeihill@gmail.com (receivable QR codes)
-- =====================================================================

-- STEP 0: List and disable ALL triggers on suppliers table
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

-- STEP 2: Clean up previous test data
DELETE FROM public.qr_scan_events WHERE qr_code LIKE 'UJP-%TEST%' OR qr_code LIKE 'UJP-%-B00%';
DELETE FROM public.material_items WHERE qr_code LIKE 'UJP-%TEST%' OR qr_code LIKE 'UJP-%-B00%';
DELETE FROM public.purchase_orders WHERE po_number LIKE 'PO-TEST-%';

-- STEP 3: Insert test data with proper supplier-builder relationship
DO $$
DECLARE
    supplier_user_id UUID;
    supplier_record_id UUID;
    builder_user_id UUID;
    po_id1 UUID := gen_random_uuid();
    po_id2 UUID := gen_random_uuid();
    po_id3 UUID := gen_random_uuid();
BEGIN
    -- Get supplier USER ID (mamaethan@gmail.com)
    SELECT id INTO supplier_user_id FROM auth.users WHERE email = 'mamaethan@gmail.com';
    
    -- Get supplier RECORD ID from suppliers table (this is what material_items.supplier_id references)
    SELECT id INTO supplier_record_id FROM public.suppliers WHERE user_id = supplier_user_id;
    
    -- Get builder USER ID (kosgeihill@gmail.com) - THIS IS THE PROFESSIONAL BUILDER
    SELECT id INTO builder_user_id FROM auth.users WHERE email = 'kosgeihill@gmail.com';

    RAISE NOTICE '========================================';
    RAISE NOTICE '📦 SUPPLIER INFO:';
    RAISE NOTICE '   Email: mamaethan@gmail.com';
    RAISE NOTICE '   User ID: %', supplier_user_id;
    RAISE NOTICE '   Supplier Record ID: %', supplier_record_id;
    RAISE NOTICE '';
    RAISE NOTICE '🏗️ BUILDER INFO:';
    RAISE NOTICE '   Email: kosgeihill@gmail.com';
    RAISE NOTICE '   User ID: %', builder_user_id;
    RAISE NOTICE '========================================';

    IF supplier_user_id IS NULL THEN
        RAISE EXCEPTION 'Supplier user mamaethan@gmail.com not found in auth.users!';
    END IF;
    
    IF builder_user_id IS NULL THEN
        RAISE EXCEPTION 'Builder kosgeihill@gmail.com not found in auth.users!';
    END IF;

    -- If supplier record doesn't exist, we need to handle this differently
    IF supplier_record_id IS NULL THEN
        RAISE NOTICE '⚠️ No supplier record found for mamaethan@gmail.com';
        
        -- The suppliers.user_id has a FK to profiles.id (not profiles.user_id!)
        -- We need to find the profile.id for this user
        DECLARE
            profile_id_for_supplier UUID;
        BEGIN
            -- Get the profile ID (which may be different from user_id)
            SELECT id INTO profile_id_for_supplier 
            FROM public.profiles 
            WHERE user_id = supplier_user_id;
            
            IF profile_id_for_supplier IS NULL THEN
                -- No profile exists, create one with id = user_id
                RAISE NOTICE '   Creating profile for supplier...';
                INSERT INTO public.profiles (id, user_id, email, full_name)
                VALUES (supplier_user_id, supplier_user_id, 'mamaethan@gmail.com', 'Mama Ethan Supplies');
                profile_id_for_supplier := supplier_user_id;
            ELSE
                RAISE NOTICE '   Profile exists with id: %', profile_id_for_supplier;
            END IF;
            
            RAISE NOTICE '   Creating supplier record with user_id = profile.id...';
            
            -- Insert supplier with user_id = profile.id (to satisfy FK)
            INSERT INTO public.suppliers (id, user_id, company_name, email, phone, location, status)
            VALUES (
                gen_random_uuid(),
                profile_id_for_supplier,  -- Use the profile's ID, not auth user ID
                'Mama Ethan Supplies', 
                'mamaethan@gmail.com', 
                '+254700000000', 
                'Nairobi, Kenya', 
                'active'
            )
            RETURNING id INTO supplier_record_id;
            
            RAISE NOTICE '✅ Created supplier record: %', supplier_record_id;
        END;
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
        supplier_user_id,  -- purchase_orders.supplier_id references auth.users
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
    -- NOTE: material_items.supplier_id references suppliers table, NOT auth.users!
    INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
    VALUES 
        (po_id1, 'UJP-CEMENT-B001-20260119-0001', 1, 'Portland Cement 50kg', 'CEMENT', 100, 'bags', supplier_record_id, 'pending'),
        (po_id1, 'UJP-STEEL-B001-20260119-0002', 2, 'Steel Bars 12mm', 'STEEL', 50, 'pieces', supplier_record_id, 'pending');
    
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
        (po_id2, 'UJP-BLOCKS-B002-20260119-0001', 1, 'Concrete Blocks 6inch', 'BLOCKS', 500, 'pieces', supplier_record_id, 'dispatched'),
        (po_id2, 'UJP-SAND-B002-20260119-0002', 2, 'River Sand', 'SAND', 10, 'tonnes', supplier_record_id, 'in_transit');
    
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
        (po_id3, 'UJP-IRON-B003-20260119-0001', 1, 'Iron Sheets Gauge 30', 'IRON', 100, 'pieces', supplier_record_id, 'pending'),
        (po_id3, 'UJP-TIMBER-B003-20260119-0002', 2, 'Timber 2x4', 'TIMBER', 200, 'pieces', supplier_record_id, 'received');
    
    RAISE NOTICE '✅ Created PO 3 with 2 QR codes (pending + received)';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TEST DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📦 SUPPLIER DASHBOARD (mamaethan@gmail.com):';
    RAISE NOTICE '   Supplier Record ID: %', supplier_record_id;
    RAISE NOTICE '   - 3 QR codes with status "pending" ready to DISPATCH';
    RAISE NOTICE '   - 2 QR codes already dispatched/in_transit';
    RAISE NOTICE '   - 1 QR code already received';
    RAISE NOTICE '';
    RAISE NOTICE '🏗️ BUILDER DASHBOARD (kosgeihill@gmail.com):';
    RAISE NOTICE '   - 3 Purchase Orders visible in Orders tab';
    RAISE NOTICE '   - 6 QR code images with tracking status';
    RAISE NOTICE '';
END $$;

-- STEP 4: Recreate triggers only if their functions exist
DO $$
BEGIN
    -- Recreate QR code triggers
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

    -- Recreate supplier audit trigger
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_supplier_modifications_secure') THEN
        CREATE TRIGGER audit_supplier_modifications_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_supplier_modifications_secure();
        RAISE NOTICE 'Recreated audit_supplier_modifications_trigger';
    END IF;
END $$;

-- STEP 5: Verify the data
SELECT 
    '📦 Purchase Orders' as category,
    COUNT(*) as count 
FROM public.purchase_orders 
WHERE po_number LIKE 'PO-TEST-%-B%'

UNION ALL

SELECT 
    '🏷️ Material Items (QR Codes)' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%'

UNION ALL

SELECT 
    '📤 Pending (ready to dispatch)' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status = 'pending'

UNION ALL

SELECT 
    '🚚 Dispatched/In Transit' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status IN ('dispatched', 'in_transit')

UNION ALL

SELECT 
    '✅ Received' as category,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-B00%' AND status = 'received';

-- STEP 6: Show the supplier record for verification
SELECT 
    'Supplier Record' as info,
    s.id as supplier_record_id,
    s.company_name,
    u.email as user_email
FROM public.suppliers s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'mamaethan@gmail.com';

-- STEP 7: Show material items with their supplier
SELECT 
    mi.qr_code,
    mi.material_type,
    mi.status,
    mi.supplier_id as material_supplier_id,
    s.company_name as supplier_name
FROM public.material_items mi
LEFT JOIN public.suppliers s ON mi.supplier_id = s.id
WHERE mi.qr_code LIKE 'UJP-%-B00%'
ORDER BY mi.qr_code;

