-- =====================================================================
-- INSERT TEST QR CODES FOR BUILDER ACCOUNTS
-- =====================================================================

-- STEP 1: Drop the QR-related triggers
DROP TRIGGER IF EXISTS generate_qr_on_purchase_order_insert ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON public.purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_codes ON public.purchase_orders;

-- STEP 2: Insert test data
DO $$
DECLARE
    builder1_user_id UUID;
    builder2_user_id UUID;
    test_supplier_id UUID;
    po_id1 UUID := gen_random_uuid();
    po_id2 UUID := gen_random_uuid();
    po_id3 UUID := gen_random_uuid();
    po_id4 UUID := gen_random_uuid();
BEGIN
    SELECT id INTO builder1_user_id FROM auth.users WHERE email = 'kosgeihill@gmail.com';
    SELECT id INTO builder2_user_id FROM auth.users WHERE email = 'hillarykaptingei@gmail.com';
    SELECT id INTO test_supplier_id FROM auth.users WHERE email LIKE '%supplier%' LIMIT 1;
    IF test_supplier_id IS NULL THEN
        SELECT id INTO test_supplier_id FROM auth.users LIMIT 1;
    END IF;

    RAISE NOTICE 'Builder 1: %, Builder 2: %, Supplier: %', builder1_user_id, builder2_user_id, test_supplier_id;

    IF builder1_user_id IS NOT NULL THEN
        INSERT INTO public.purchase_orders (id, po_number, buyer_id, supplier_id, total_amount, delivery_address, delivery_date, status, items, qr_code_generated)
        VALUES (po_id1, 'PO-TEST-20260119-001', builder1_user_id, test_supplier_id, 125000, 'Nairobi, Kenya - Test Site Alpha', CURRENT_DATE + 7, 'confirmed', '[{"name": "Portland Cement 50kg", "quantity": 100, "unit": "bags", "unit_price": 750, "total": 75000}, {"name": "Steel Bars 12mm", "quantity": 50, "unit": "pieces", "unit_price": 1000, "total": 50000}]'::jsonb, true);
        
        INSERT INTO public.purchase_orders (id, po_number, buyer_id, supplier_id, total_amount, delivery_address, delivery_date, status, items, qr_code_generated)
        VALUES (po_id2, 'PO-TEST-20260119-002', builder1_user_id, test_supplier_id, 85000, 'Nairobi, Kenya - Test Site Beta', CURRENT_DATE + 5, 'confirmed', '[{"name": "Concrete Blocks 6inch", "quantity": 500, "unit": "pieces", "unit_price": 120, "total": 60000}, {"name": "River Sand", "quantity": 10, "unit": "tonnes", "unit_price": 2500, "total": 25000}]'::jsonb, true);
        
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id1, 'UJP-CEMENT-TEST001-20260119-0001', 1, 'Portland Cement 50kg', 'CEMENT', 100, 'bags', test_supplier_id, 'pending'),
            (po_id1, 'UJP-STEEL-TEST001-20260119-0002', 2, 'Steel Bars 12mm', 'STEEL', 50, 'pieces', test_supplier_id, 'pending'),
            (po_id2, 'UJP-BLOCKS-TEST002-20260119-0001', 1, 'Concrete Blocks 6inch', 'BLOCKS', 500, 'pieces', test_supplier_id, 'dispatched'),
            (po_id2, 'UJP-SAND-TEST002-20260119-0002', 2, 'River Sand', 'SAND', 10, 'tonnes', test_supplier_id, 'received');
        
        RAISE NOTICE 'Created POs and QR codes for builder1';
    END IF;

    IF builder2_user_id IS NOT NULL THEN
        INSERT INTO public.purchase_orders (id, po_number, buyer_id, supplier_id, total_amount, delivery_address, delivery_date, status, items, qr_code_generated)
        VALUES (po_id3, 'PO-TEST-20260119-003', builder2_user_id, test_supplier_id, 180000, 'Kisumu, Kenya - Residential Project', CURRENT_DATE + 10, 'confirmed', '[{"name": "Iron Sheets Gauge 30", "quantity": 100, "unit": "pieces", "unit_price": 1200, "total": 120000}, {"name": "Timber 2x4", "quantity": 200, "unit": "pieces", "unit_price": 300, "total": 60000}]'::jsonb, true);
        
        INSERT INTO public.purchase_orders (id, po_number, buyer_id, supplier_id, total_amount, delivery_address, delivery_date, status, items, qr_code_generated)
        VALUES (po_id4, 'PO-TEST-20260119-004', builder2_user_id, test_supplier_id, 95000, 'Eldoret, Kenya - Commercial Building', CURRENT_DATE + 14, 'confirmed', '[{"name": "PVC Pipes 4inch", "quantity": 50, "unit": "pieces", "unit_price": 800, "total": 40000}, {"name": "Electrical Cable 2.5mm", "quantity": 10, "unit": "rolls", "unit_price": 3500, "total": 35000}, {"name": "Circuit Breakers", "quantity": 20, "unit": "pieces", "unit_price": 1000, "total": 20000}]'::jsonb, true);
        
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id3, 'UJP-IRON-TEST003-20260119-0001', 1, 'Iron Sheets Gauge 30', 'IRON', 100, 'pieces', test_supplier_id, 'pending'),
            (po_id3, 'UJP-TIMBER-TEST003-20260119-0002', 2, 'Timber 2x4', 'TIMBER', 200, 'pieces', test_supplier_id, 'in_transit'),
            (po_id4, 'UJP-PVC-TEST004-20260119-0001', 1, 'PVC Pipes 4inch', 'PVC', 50, 'pieces', test_supplier_id, 'pending'),
            (po_id4, 'UJP-CABLE-TEST004-20260119-0002', 2, 'Electrical Cable 2.5mm', 'CABLE', 10, 'rolls', test_supplier_id, 'received'),
            (po_id4, 'UJP-CIRCUIT-TEST004-20260119-0003', 3, 'Circuit Breakers', 'CIRCUIT', 20, 'pieces', test_supplier_id, 'verified');
        
        RAISE NOTICE 'Created POs and QR codes for builder2';
    END IF;

    RAISE NOTICE 'Test data created successfully!';
END $$;

-- STEP 3: Recreate triggers only if their functions exist
DO $$
BEGIN
    -- Recreate trigger_auto_generate_item_qr_codes if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_item_qr_codes') THEN
        CREATE TRIGGER trigger_auto_generate_item_qr_codes
            BEFORE INSERT OR UPDATE ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_generate_item_qr_codes();
        RAISE NOTICE 'Recreated trigger_auto_generate_item_qr_codes';
    END IF;

    -- Recreate trigger_auto_generate_qr_codes if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_qr_codes_for_purchase_order') THEN
        CREATE TRIGGER trigger_auto_generate_qr_codes
            AFTER UPDATE ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_generate_qr_codes_for_purchase_order();
        RAISE NOTICE 'Recreated trigger_auto_generate_qr_codes';
    END IF;

    -- Recreate generate_qr_on_purchase_order_insert if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_qr_on_purchase_order') THEN
        CREATE TRIGGER generate_qr_on_purchase_order_insert
            AFTER INSERT ON public.purchase_orders
            FOR EACH ROW
            EXECUTE FUNCTION public.generate_qr_on_purchase_order();
        RAISE NOTICE 'Recreated generate_qr_on_purchase_order_insert';
    END IF;
END $$;

-- STEP 4: Insert into legacy table
INSERT INTO public.material_qr_codes (qr_code, material_type, batch_number, quantity, unit, status)
VALUES 
    ('UJP-TEST-CEMENT-001', 'Portland Cement 50kg', 'BATCH-2026-001', 100, 'bags', 'pending'),
    ('UJP-TEST-STEEL-001', 'Steel Bars 12mm', 'BATCH-2026-002', 50, 'pieces', 'pending'),
    ('UJP-TEST-BLOCKS-001', 'Concrete Blocks 6inch', 'BATCH-2026-003', 500, 'pieces', 'dispatched'),
    ('UJP-TEST-SAND-001', 'River Sand', 'BATCH-2026-004', 10, 'tonnes', 'received')
ON CONFLICT (qr_code) DO NOTHING;

-- STEP 5: Show results
SELECT 'purchase_orders' as tbl, COUNT(*) as cnt FROM public.purchase_orders WHERE po_number LIKE 'PO-TEST-%'
UNION ALL
SELECT 'material_items', COUNT(*) FROM public.material_items WHERE qr_code LIKE 'UJP-%TEST%';
