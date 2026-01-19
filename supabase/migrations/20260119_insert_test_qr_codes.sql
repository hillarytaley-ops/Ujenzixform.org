-- =====================================================================
-- INSERT TEST QR CODES FOR BUILDER ACCOUNTS
-- This creates test purchase orders with QR codes for testing
-- Accounts: kosgeihill@gmail.com, hillarykaptingei@gmail.com
-- =====================================================================

-- First, get the user IDs and create test data
DO $$
DECLARE
    builder1_user_id UUID;
    builder2_user_id UUID;
    test_supplier_id UUID;
    po_id1 UUID;
    po_id2 UUID;
    po_id3 UUID;
    po_id4 UUID;
BEGIN
    -- Get user IDs for the builder accounts
    SELECT id INTO builder1_user_id FROM auth.users WHERE email = 'kosgeihill@gmail.com';
    SELECT id INTO builder2_user_id FROM auth.users WHERE email = 'hillarykaptingei@gmail.com';
    
    -- Get any existing supplier ID (or create a test one)
    SELECT id INTO test_supplier_id FROM auth.users WHERE email LIKE '%supplier%' LIMIT 1;
    
    -- If no supplier found, use one of the builder IDs as a fallback
    IF test_supplier_id IS NULL THEN
        test_supplier_id := builder1_user_id;
    END IF;

    -- Log what we found
    RAISE NOTICE 'Builder 1 (kosgeihill@gmail.com): %', builder1_user_id;
    RAISE NOTICE 'Builder 2 (hillarykaptingei@gmail.com): %', builder2_user_id;
    RAISE NOTICE 'Test Supplier ID: %', test_supplier_id;

    -- Only proceed if we have at least one builder
    IF builder1_user_id IS NOT NULL THEN
        -- Create Purchase Order 1 for builder1 (Cement & Steel)
        INSERT INTO public.purchase_orders (
            id, po_number, buyer_id, supplier_id, total_amount, 
            delivery_address, delivery_date, status, items, qr_code_generated
        ) VALUES (
            gen_random_uuid(),
            'PO-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
            builder1_user_id,
            test_supplier_id,
            125000,
            'Nairobi, Kenya - Test Site Alpha',
            CURRENT_DATE + INTERVAL '7 days',
            'confirmed',
            '[
                {"name": "Portland Cement 50kg", "quantity": 100, "unit": "bags", "unit_price": 750, "total": 75000},
                {"name": "Steel Bars 12mm", "quantity": 50, "unit": "pieces", "unit_price": 1000, "total": 50000}
            ]'::jsonb,
            false
        ) RETURNING id INTO po_id1;
        
        RAISE NOTICE 'Created PO 1: %', po_id1;

        -- Create Purchase Order 2 for builder1 (Blocks & Sand)
        INSERT INTO public.purchase_orders (
            id, po_number, buyer_id, supplier_id, total_amount, 
            delivery_address, delivery_date, status, items, qr_code_generated
        ) VALUES (
            gen_random_uuid(),
            'PO-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
            builder1_user_id,
            test_supplier_id,
            85000,
            'Nairobi, Kenya - Test Site Beta',
            CURRENT_DATE + INTERVAL '5 days',
            'confirmed',
            '[
                {"name": "Concrete Blocks 6inch", "quantity": 500, "unit": "pieces", "unit_price": 120, "total": 60000},
                {"name": "River Sand", "quantity": 10, "unit": "tonnes", "unit_price": 2500, "total": 25000}
            ]'::jsonb,
            false
        ) RETURNING id INTO po_id2;
        
        RAISE NOTICE 'Created PO 2: %', po_id2;
    END IF;

    IF builder2_user_id IS NOT NULL THEN
        -- Create Purchase Order 3 for builder2 (Roofing Materials)
        INSERT INTO public.purchase_orders (
            id, po_number, buyer_id, supplier_id, total_amount, 
            delivery_address, delivery_date, status, items, qr_code_generated
        ) VALUES (
            gen_random_uuid(),
            'PO-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
            builder2_user_id,
            test_supplier_id,
            180000,
            'Kisumu, Kenya - Residential Project',
            CURRENT_DATE + INTERVAL '10 days',
            'confirmed',
            '[
                {"name": "Iron Sheets Gauge 30", "quantity": 100, "unit": "pieces", "unit_price": 1200, "total": 120000},
                {"name": "Timber 2x4", "quantity": 200, "unit": "pieces", "unit_price": 300, "total": 60000}
            ]'::jsonb,
            false
        ) RETURNING id INTO po_id3;
        
        RAISE NOTICE 'Created PO 3: %', po_id3;

        -- Create Purchase Order 4 for builder2 (Electrical & Plumbing)
        INSERT INTO public.purchase_orders (
            id, po_number, buyer_id, supplier_id, total_amount, 
            delivery_address, delivery_date, status, items, qr_code_generated
        ) VALUES (
            gen_random_uuid(),
            'PO-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-004',
            builder2_user_id,
            test_supplier_id,
            95000,
            'Eldoret, Kenya - Commercial Building',
            CURRENT_DATE + INTERVAL '14 days',
            'confirmed',
            '[
                {"name": "PVC Pipes 4inch", "quantity": 50, "unit": "pieces", "unit_price": 800, "total": 40000},
                {"name": "Electrical Cable 2.5mm", "quantity": 10, "unit": "rolls", "unit_price": 3500, "total": 35000},
                {"name": "Circuit Breakers", "quantity": 20, "unit": "pieces", "unit_price": 1000, "total": 20000}
            ]'::jsonb,
            false
        ) RETURNING id INTO po_id4;
        
        RAISE NOTICE 'Created PO 4: %', po_id4;
    END IF;

    -- Now manually insert QR codes into material_items table
    -- (The trigger may not fire for existing rows, so we do it manually)
    
    IF po_id1 IS NOT NULL THEN
        -- QR codes for PO 1
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id1, 'UJP-CEMENT-TEST001-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001', 1, 'Portland Cement 50kg', 'CEMENT', 100, 'bags', test_supplier_id, 'pending'),
            (po_id1, 'UJP-STEEL-TEST001-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0002', 2, 'Steel Bars 12mm', 'STEEL', 50, 'pieces', test_supplier_id, 'pending')
        ON CONFLICT (qr_code) DO NOTHING;
        
        UPDATE public.purchase_orders SET qr_code_generated = true WHERE id = po_id1;
    END IF;
    
    IF po_id2 IS NOT NULL THEN
        -- QR codes for PO 2
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id2, 'UJP-BLOCKS-TEST002-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001', 1, 'Concrete Blocks 6inch', 'BLOCKS', 500, 'pieces', test_supplier_id, 'pending'),
            (po_id2, 'UJP-SAND-TEST002-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0002', 2, 'River Sand', 'SAND', 10, 'tonnes', test_supplier_id, 'dispatched')
        ON CONFLICT (qr_code) DO NOTHING;
        
        UPDATE public.purchase_orders SET qr_code_generated = true WHERE id = po_id2;
    END IF;
    
    IF po_id3 IS NOT NULL THEN
        -- QR codes for PO 3
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id3, 'UJP-IRON-TEST003-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001', 1, 'Iron Sheets Gauge 30', 'IRON', 100, 'pieces', test_supplier_id, 'pending'),
            (po_id3, 'UJP-TIMBER-TEST003-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0002', 2, 'Timber 2x4', 'TIMBER', 200, 'pieces', test_supplier_id, 'in_transit')
        ON CONFLICT (qr_code) DO NOTHING;
        
        UPDATE public.purchase_orders SET qr_code_generated = true WHERE id = po_id3;
    END IF;
    
    IF po_id4 IS NOT NULL THEN
        -- QR codes for PO 4
        INSERT INTO public.material_items (purchase_order_id, qr_code, item_sequence, material_type, category, quantity, unit, supplier_id, status)
        VALUES 
            (po_id4, 'UJP-PVC-TEST004-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001', 1, 'PVC Pipes 4inch', 'PVC', 50, 'pieces', test_supplier_id, 'pending'),
            (po_id4, 'UJP-CABLE-TEST004-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0002', 2, 'Electrical Cable 2.5mm', 'CABLE', 10, 'rolls', test_supplier_id, 'received'),
            (po_id4, 'UJP-CIRCUIT-TEST004-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0003', 3, 'Circuit Breakers', 'CIRCUIT', 20, 'pieces', test_supplier_id, 'verified')
        ON CONFLICT (qr_code) DO NOTHING;
        
        UPDATE public.purchase_orders SET qr_code_generated = true WHERE id = po_id4;
    END IF;

    RAISE NOTICE '✅ Test QR codes created successfully!';
    RAISE NOTICE 'Check the builder dashboards for kosgeihill@gmail.com and hillarykaptingei@gmail.com';
END $$;

-- Also insert into the older material_qr_codes table for compatibility
INSERT INTO public.material_qr_codes (qr_code, material_type, batch_number, quantity, unit, status)
VALUES 
    ('UJP-TEST-CEMENT-001', 'Portland Cement 50kg', 'BATCH-2026-001', 100, 'bags', 'pending'),
    ('UJP-TEST-STEEL-001', 'Steel Bars 12mm', 'BATCH-2026-002', 50, 'pieces', 'pending'),
    ('UJP-TEST-BLOCKS-001', 'Concrete Blocks 6inch', 'BATCH-2026-003', 500, 'pieces', 'dispatched'),
    ('UJP-TEST-SAND-001', 'River Sand', 'BATCH-2026-004', 10, 'tonnes', 'received'),
    ('UJP-TEST-IRON-001', 'Iron Sheets Gauge 30', 'BATCH-2026-005', 100, 'pieces', 'pending'),
    ('UJP-TEST-TIMBER-001', 'Timber 2x4', 'BATCH-2026-006', 200, 'pieces', 'verified')
ON CONFLICT (qr_code) DO NOTHING;

-- Show summary
SELECT 
    'material_items' as table_name,
    COUNT(*) as count 
FROM public.material_items 
WHERE qr_code LIKE 'UJP-%-TEST%'
UNION ALL
SELECT 
    'material_qr_codes' as table_name,
    COUNT(*) as count 
FROM public.material_qr_codes 
WHERE qr_code LIKE 'UJP-TEST-%';

