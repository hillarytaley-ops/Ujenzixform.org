-- ========================================
-- FIX: Security Definer View Issue
-- ========================================
-- Convert deliveries_safe view to use security_invoker instead

-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.deliveries_safe;

CREATE VIEW public.deliveries_safe 
WITH (security_invoker = true) AS
SELECT 
  d.id,
  d.supplier_id,
  d.builder_id,
  d.project_id,
  d.quantity,
  d.weight_kg,
  d.pickup_date,
  d.delivery_date,
  d.estimated_delivery_time,
  d.actual_delivery_time,
  d.created_at,
  d.updated_at,
  d.tracking_number,
  d.material_type,
  d.pickup_address,
  d.delivery_address,
  d.status,
  d.vehicle_details,
  d.notes,
  -- Mask driver contact based on user role
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_name
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.id = d.builder_id
      AND d.status IN ('in_progress', 'out_for_delivery', 'delivered')
    ) THEN d.driver_name
    ELSE 'Driver assigned'
  END as driver_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_phone
    ELSE 'Contact via platform'
  END as driver_phone
FROM deliveries d;

GRANT SELECT ON public.deliveries_safe TO authenticated;

-- Log the fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'security_definer_view_fixed',
  'medium',
  jsonb_build_object(
    'description', 'Converted deliveries_safe view to use security_invoker',
    'view_name', 'deliveries_safe',
    'timestamp', NOW()
  )
);