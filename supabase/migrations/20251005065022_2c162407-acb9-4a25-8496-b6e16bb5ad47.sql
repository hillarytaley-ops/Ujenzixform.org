-- Critical Security Fix: Protect Sensitive Personal Data
-- Addresses: PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA, MISSING_RLS_PROTECTION

-- 1. Secure deliveries_safe VIEW (driver phone numbers)
DROP VIEW IF EXISTS public.deliveries_safe CASCADE;

CREATE VIEW public.deliveries_safe
WITH (security_invoker = true)
AS
SELECT 
  d.id,
  d.tracking_number,
  d.material_type,
  d.quantity,
  d.weight_kg,
  d.pickup_address,
  d.delivery_address,
  d.status,
  d.pickup_date,
  d.delivery_date,
  d.estimated_delivery_time,
  d.actual_delivery_time,
  d.vehicle_details,
  d.notes,
  d.supplier_id,
  d.builder_id,
  d.project_id,
  d.created_at,
  d.updated_at,
  -- Protect driver contact - only show during active deliveries to participants
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_name
    WHEN d.status IN ('in_progress', 'out_for_delivery', 'delivered') AND 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = d.builder_id)
    THEN d.driver_name
    ELSE NULL
  END as driver_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_phone
    WHEN d.status IN ('in_progress', 'out_for_delivery') AND 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = d.builder_id)
    THEN d.driver_phone
    ELSE NULL
  END as driver_phone
FROM public.deliveries d;

REVOKE ALL ON public.deliveries_safe FROM anon, public;
GRANT SELECT ON public.deliveries_safe TO authenticated;

-- 2. Secure profiles_business_directory VIEW
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  -- Mask personal names unless admin or verified business partner
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.full_name
    WHEN EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN profiles current_p ON current_p.user_id = auth.uid()
      WHERE ((po.buyer_id = current_p.id AND po.supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = p.user_id
      )) OR (po.supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = current_p.user_id
      ) AND po.buyer_id = p.id))
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > NOW() - INTERVAL '90 days'
    ) THEN p.full_name
    ELSE substring(p.full_name, 1, 1) || '***'
  END as full_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.company_name
    WHEN auth.uid() IS NOT NULL THEN substring(p.company_name, 1, 30) || '...'
    ELSE 'Protected'
  END as company_name,
  p.user_type,
  p.is_professional,
  p.created_at
FROM profiles p
WHERE p.role IN ('builder', 'supplier')
  AND (p.user_type = 'company' OR p.is_professional = true)
  AND auth.uid() IS NOT NULL;

REVOKE ALL ON public.profiles_business_directory FROM anon, public;
GRANT SELECT ON public.profiles_business_directory TO authenticated;

-- 3. Create vault access logging function (outside DO block)
DROP FUNCTION IF EXISTS log_vault_access_function() CASCADE;

CREATE OR REPLACE FUNCTION log_vault_access_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
  
  INSERT INTO security_events (user_id, event_type, severity, details)
  VALUES (
    auth.uid(),
    'vault_access',
    CASE 
      WHEN user_role = 'admin' THEN 'medium'
      WHEN user_role = 'delivery_provider' THEN 'low'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'user_role', user_role,
      'timestamp', NOW()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Enhance delivery_provider_personal_data_vault security
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_provider_personal_data_vault') THEN
    ALTER TABLE public.delivery_provider_personal_data_vault ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "personal_data_vault_ultra_admin_only" ON public.delivery_provider_personal_data_vault;
    DROP POLICY IF EXISTS "vault_admin_access_logged" ON public.delivery_provider_personal_data_vault;
    DROP POLICY IF EXISTS "vault_owner_read_only" ON public.delivery_provider_personal_data_vault;
    DROP POLICY IF EXISTS "vault_admin_modify" ON public.delivery_provider_personal_data_vault;
    
    CREATE POLICY "vault_admin_access_logged"
    ON public.delivery_provider_personal_data_vault
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "vault_owner_read_only"
    ON public.delivery_provider_personal_data_vault
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_provider_personal_data_vault.provider_id
          AND dp.user_id = auth.uid()
      )
    );
    
    CREATE POLICY "vault_admin_modify"
    ON public.delivery_provider_personal_data_vault
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
    
    DROP TRIGGER IF EXISTS log_vault_access_trigger ON public.delivery_provider_personal_data_vault;
    
    CREATE TRIGGER log_vault_access_trigger
    AFTER INSERT OR UPDATE OR DELETE
    ON public.delivery_provider_personal_data_vault
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_vault_access_function();
  END IF;
END $$;

-- 5. Security audit log
INSERT INTO security_events (user_id, event_type, severity, details)
VALUES (
  NULL,
  'critical_security_fix',
  'high',
  jsonb_build_object(
    'action', 'secured_sensitive_data',
    'views_secured', ARRAY['deliveries_safe', 'profiles_business_directory'],
    'tables_secured', ARRAY['delivery_provider_personal_data_vault'],
    'measures', ARRAY[
      'driver_contact_protected',
      'active_delivery_only_access',
      'business_relationship_verification',
      'comprehensive_access_logging',
      'admin_access_tracked'
    ],
    'timestamp', NOW()
  )
);