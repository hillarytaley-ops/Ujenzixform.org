-- =====================================================================
-- FIX SECURITY DEFINER VIEW WARNING
-- =====================================================================
-- The view supplier_qr_codes_with_clients was created with SECURITY DEFINER
-- which bypasses RLS policies. We need to recreate it with SECURITY INVOKER
-- to respect the RLS policies of the querying user.
-- =====================================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.supplier_qr_codes_with_clients;

-- Recreate the view with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW public.supplier_qr_codes_with_clients 
WITH (security_invoker = true)
AS
SELECT 
    mi.id,
    mi.qr_code,
    mi.material_type,
    mi.category,
    mi.quantity,
    mi.unit,
    mi.status,
    mi.buyer_id,
    mi.buyer_name,
    mi.buyer_email,
    mi.buyer_phone,
    mi.item_unit_price,
    mi.item_total_price,
    mi.dispatch_scanned,
    mi.dispatch_scanned_at,
    mi.receive_scanned,
    mi.receive_scanned_at,
    mi.qr_code_generated_at,
    mi.supplier_id,
    mi.purchase_order_id,
    po.po_number,
    po.delivery_address,
    po.delivery_date,
    s.company_name as supplier_name
FROM public.material_items mi
JOIN public.purchase_orders po ON po.id = mi.purchase_order_id
LEFT JOIN public.suppliers s ON s.id = mi.supplier_id;

-- Add comment
COMMENT ON VIEW public.supplier_qr_codes_with_clients IS 
'View for suppliers to see QR codes with client information. 
Uses SECURITY INVOKER to respect RLS policies of the querying user.';

