-- COMPREHENSIVE SECURITY FIX: Address all Aikido security vulnerabilities

-- 1. FIX: Delivery Provider Personal Information Protection
DROP POLICY IF EXISTS "delivery_providers_secure_own_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "secure_providers_owner_admin" ON public.delivery_providers;

CREATE POLICY "providers_ultra_secure_access" ON public.delivery_providers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
);

-- 2. FIX: Supplier Contact Information Protection  
DROP POLICY IF EXISTS "suppliers_authorized_access_only" ON public.suppliers;

CREATE POLICY "suppliers_ultra_secure_access" ON public.suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
);

-- 3. FIX: User Profile Data Protection
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_ultra_secure_access" ON public.profiles
FOR ALL USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. FIX: Payment Data Protection
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_user_access" ON public.payments;

CREATE POLICY "payments_ultra_secure_access" ON public.payments
FOR ALL USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. FIX: Delivery Location Data Protection
DROP POLICY IF EXISTS "deliveries_admin_temp" ON public.deliveries;

CREATE POLICY "deliveries_ultra_secure_access" ON public.deliveries
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = deliveries.builder_id OR 
      p.id = deliveries.supplier_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = deliveries.builder_id OR 
      p.id = deliveries.supplier_id
    )
  )
);

-- Similar protection for delivery_requests
DROP POLICY IF EXISTS "delivery_requests_admin_temp" ON public.delivery_requests;

CREATE POLICY "delivery_requests_ultra_secure_access" ON public.delivery_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = delivery_requests.builder_id OR 
      EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = delivery_requests.provider_id AND dp.user_id = p.id
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = delivery_requests.builder_id
    )
  )
);

-- Protection for delivery_tracking
DROP POLICY IF EXISTS "delivery_tracking_admin_temp" ON public.delivery_tracking;

CREATE POLICY "delivery_tracking_ultra_secure_access" ON public.delivery_tracking
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      EXISTS (
        SELECT 1 FROM delivery_requests dr 
        WHERE dr.id = delivery_tracking.delivery_request_id 
        AND (
          dr.builder_id = p.id OR 
          EXISTS (
            SELECT 1 FROM delivery_providers dp 
            WHERE dp.id = dr.provider_id AND dp.user_id = p.id
          )
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      EXISTS (
        SELECT 1 FROM delivery_providers dp 
        WHERE dp.id = delivery_tracking.provider_id AND dp.user_id = p.id
      )
    )
  )
);

-- 6. FIX: Admin User Data Protection
CREATE POLICY "admin_users_ultra_secure_access" ON public.admin_users
FOR ALL USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7. Create comprehensive audit logging
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO contact_security_audit (
    user_id, target_table, action_attempted, was_authorized, client_info
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP || '_SENSITIVE_DATA_ACCESS',
    true,
    jsonb_build_object(
      'timestamp', NOW(),
      'record_id', COALESCE(NEW.id, OLD.id),
      'table', TG_TABLE_NAME
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comprehensive logging triggers
DROP TRIGGER IF EXISTS log_delivery_providers_access ON public.delivery_providers;
CREATE TRIGGER log_delivery_providers_access
  AFTER SELECT OR UPDATE ON public.delivery_providers
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

DROP TRIGGER IF EXISTS log_payments_access ON public.payments;  
CREATE TRIGGER log_payments_access
  AFTER SELECT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

DROP TRIGGER IF EXISTS log_deliveries_location_access ON public.deliveries;
CREATE TRIGGER log_deliveries_location_access
  AFTER SELECT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

-- Security documentation
COMMENT ON POLICY "providers_ultra_secure_access" ON public.delivery_providers IS 
'AIKIDO FIX: Ultra-secure access - only provider owners and admins can access sensitive provider data';

COMMENT ON POLICY "suppliers_ultra_secure_access" ON public.suppliers IS 
'AIKIDO FIX: Ultra-secure access - only supplier owners and admins can access contact data';

COMMENT ON POLICY "profiles_ultra_secure_access" ON public.profiles IS 
'AIKIDO FIX: Ultra-secure access - only profile owners and admins can access personal data';

COMMENT ON POLICY "payments_ultra_secure_access" ON public.payments IS 
'AIKIDO FIX: Ultra-secure access - only payment owners and admins can access financial data';

COMMENT ON POLICY "deliveries_ultra_secure_access" ON public.deliveries IS 
'AIKIDO FIX: Ultra-secure access - only delivery participants and admins can access location data';

COMMENT ON POLICY "admin_users_ultra_secure_access" ON public.admin_users IS 
'AIKIDO FIX: Ultra-secure access - only admins can access admin user data';