-- =====================================================================
-- PART 1: FIX SECURITY DEFINER VIEWS ONLY
-- Run this first
-- =====================================================================

-- 1. registration_summary
DROP VIEW IF EXISTS public.registration_summary CASCADE;

CREATE OR REPLACE VIEW public.registration_summary 
WITH (security_invoker = on)
AS
SELECT 
    DATE(created_at) as registration_date,
    COUNT(*) as total_registrations,
    COUNT(CASE WHEN user_type = 'professional_builder' THEN 1 END) as professional_builders,
    COUNT(CASE WHEN user_type = 'private_client' THEN 1 END) as private_clients,
    COUNT(CASE WHEN user_type = 'supplier' THEN 1 END) as suppliers,
    COUNT(CASE WHEN user_type = 'delivery_provider' THEN 1 END) as delivery_providers
FROM public.profiles
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- 2. daily_registration_stats
DROP VIEW IF EXISTS public.daily_registration_stats CASCADE;

CREATE OR REPLACE VIEW public.daily_registration_stats 
WITH (security_invoker = on)
AS
SELECT 
    DATE(created_at) as stat_date,
    COUNT(*) as new_users,
    COUNT(CASE WHEN user_type = 'professional_builder' THEN 1 END) as new_builders,
    COUNT(CASE WHEN user_type = 'private_client' THEN 1 END) as new_clients,
    COUNT(CASE WHEN user_type = 'supplier' THEN 1 END) as new_suppliers
FROM public.profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

-- 3. supplier_qr_codes_with_clients
DROP VIEW IF EXISTS public.supplier_qr_codes_with_clients CASCADE;

CREATE OR REPLACE VIEW public.supplier_qr_codes_with_clients 
WITH (security_invoker = on)
AS
SELECT 
    mi.id,
    mi.qr_code,
    mi.material_type,
    mi.category,
    mi.quantity,
    mi.unit,
    mi.status,
    mi.supplier_id,
    mi.purchase_order_id,
    po.po_number,
    s.company_name as supplier_name
FROM public.material_items mi
JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN public.suppliers s ON s.id = mi.supplier_id;

SELECT 'Views fixed' as status;

