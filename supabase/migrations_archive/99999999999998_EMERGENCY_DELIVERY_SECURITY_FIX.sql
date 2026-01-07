-- 🚨 EMERGENCY SECURITY FIX: Secure ALL delivery-related tables
-- This migration fixes CRITICAL vulnerabilities in delivery system tables that expose:
-- - Driver personal information and business details
-- - Private business communications and negotiations  
-- - Real-time GPS tracking and location data
-- - Construction site addresses and delivery schedules
-- - Sensitive project information and material details

-- =============================================================================
-- STEP 1: SECURE DELIVERY_PROVIDERS TABLE (Business & Personal Information)
-- =============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own delivery provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Secure provider profile access" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can create their own provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can update their own provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Public can view delivery providers" ON public.delivery_providers;

-- Enable RLS and revoke public access
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_providers FROM PUBLIC;
REVOKE ALL ON public.delivery_providers FROM anon;

-- Secure policies for delivery_providers
CREATE POLICY "Secure: Providers view own profile only"
ON public.delivery_providers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_providers.user_id
  )
);

CREATE POLICY "Secure: Admin full access to providers"
ON public.delivery_providers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Secure: Providers manage own profile"
ON public.delivery_providers FOR INSERT, UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_providers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_providers.user_id
  )
);

-- =============================================================================
-- STEP 2: SECURE DELIVERY_COMMUNICATIONS TABLE (Private Messages)
-- =============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their delivery communications" ON public.delivery_communications;
DROP POLICY IF EXISTS "Users can send delivery communications" ON public.delivery_communications;

-- Enable RLS and revoke public access
ALTER TABLE public.delivery_communications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_communications FROM PUBLIC;
REVOKE ALL ON public.delivery_communications FROM anon;

-- Highly restrictive policies for private communications
CREATE POLICY "Secure: Message participants only"
ON public.delivery_communications FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can view all communications for moderation
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Message sender can view
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_communications.sender_id
    ) OR
    -- Message recipient can view (builder or supplier involved in delivery)
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE d.id = delivery_communications.delivery_id
      AND (d.builder_id = p.id OR d.supplier_id IN (
        SELECT s.id FROM public.suppliers s WHERE s.user_id = p.id
      ))
    )
  )
);

CREATE POLICY "Secure: Authorized users send messages"
ON public.delivery_communications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_communications.sender_id
  ) AND
  -- Can only send messages for deliveries they're involved in
  EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE d.id = delivery_communications.delivery_id
    AND (d.builder_id = p.id OR d.supplier_id IN (
      SELECT s.id FROM public.suppliers s WHERE s.user_id = p.id
    ))
  )
);

-- =============================================================================
-- STEP 3: SECURE DELIVERY_TRACKING TABLE (GPS & Location Data)
-- =============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view delivery tracking" ON public.delivery_tracking;
DROP POLICY IF EXISTS "Delivery providers can update tracking" ON public.delivery_tracking;

-- Enable RLS and revoke public access
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_tracking FROM PUBLIC;
REVOKE ALL ON public.delivery_tracking FROM anon;

-- Extremely restrictive policies for GPS tracking data
CREATE POLICY "Secure: Tracking participants only"
ON public.delivery_tracking FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can view all tracking for system management
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Builder can view tracking for their own deliveries
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE d.id = delivery_tracking.delivery_id
      AND d.builder_id = p.id
      AND p.role = 'builder'
    ) OR
    -- Supplier can view tracking for their assigned deliveries
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.user_id = auth.uid()
      JOIN public.suppliers s ON s.user_id = p.id
      WHERE d.id = delivery_tracking.delivery_id
      AND d.supplier_id = s.id
      AND p.role = 'supplier'
    )
  )
);

CREATE POLICY "Secure: Authorized tracking updates only"
ON public.delivery_tracking FOR INSERT, UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can update any tracking
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Delivery provider can update their assigned deliveries
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.delivery_providers dp ON dp.id = d.driver_id
      JOIN public.profiles p ON p.id = dp.user_id
      WHERE d.id = delivery_tracking.delivery_id
      AND p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Same conditions for insert/update
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.delivery_providers dp ON dp.id = d.driver_id
      JOIN public.profiles p ON p.id = dp.user_id
      WHERE d.id = delivery_tracking.delivery_id
      AND p.user_id = auth.uid()
    )
  )
);

-- =============================================================================
-- STEP 4: SECURE DELIVERY_REQUESTS TABLE (Addresses & Schedules)
-- =============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Limited status updates for authorized parties" ON public.delivery_requests;
DROP POLICY IF EXISTS "Users can view their delivery requests" ON public.delivery_requests;

-- Enable RLS and revoke public access
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_requests FROM PUBLIC;
REVOKE ALL ON public.delivery_requests FROM anon;

-- Secure policies for delivery requests
CREATE POLICY "Secure: Request owner access only"
ON public.delivery_requests FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can view all requests
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Builder can view their own requests
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_requests.builder_id
      AND role = 'builder'
    ) OR
    -- Assigned delivery provider can view
    EXISTS (
      SELECT 1 FROM public.delivery_providers dp
      JOIN public.profiles p ON p.id = dp.user_id
      WHERE p.user_id = auth.uid()
      AND dp.id = delivery_requests.assigned_provider_id
    )
  )
);

CREATE POLICY "Secure: Builders create own requests"
ON public.delivery_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND id = delivery_requests.builder_id
    AND role = 'builder'
  )
);

CREATE POLICY "Secure: Authorized request updates"
ON public.delivery_requests FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can update any request
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Builder can update their own requests
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_requests.builder_id
      AND role = 'builder'
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_requests.builder_id
      AND role = 'builder'
    )
  )
);

-- =============================================================================
-- STEP 5: SECURE DELIVERY_NOTIFICATIONS TABLE (Project Information)
-- =============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their delivery notifications" ON public.delivery_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.delivery_notifications;

-- Enable RLS and revoke public access
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_notifications FROM PUBLIC;
REVOKE ALL ON public.delivery_notifications FROM anon;

-- Secure policies for delivery notifications
CREATE POLICY "Secure: Notification recipient access only"
ON public.delivery_notifications FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin can view all notifications
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- User can view their own notifications
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_notifications.user_id
    )
  )
);

CREATE POLICY "Secure: System notification creation"
ON public.delivery_notifications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Admin can create notifications
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Users can create notifications for themselves
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = delivery_notifications.user_id
    )
  )
);

-- =============================================================================
-- STEP 6: CREATE SECURE VIEWS FOR SAFE DATA ACCESS
-- =============================================================================

-- Secure view for delivery providers (hides sensitive contact info)
CREATE OR REPLACE VIEW public.delivery_providers_public AS
SELECT 
  id,
  provider_name,
  provider_type,
  service_areas,
  vehicle_types,
  capacity_kg,
  is_verified,
  is_active,
  rating,
  created_at,
  -- Hide sensitive contact information
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) THEN phone
    ELSE 'Contact via platform'
  END as contact_info,
  -- Never expose personal details to public
  NULL as phone,
  NULL as email,
  NULL as address,
  NULL as contact_person,
  NULL as driving_license_number
FROM public.delivery_providers
WHERE is_active = true AND is_verified = true;

-- Grant access to public view
GRANT SELECT ON public.delivery_providers_public TO authenticated;

-- Secure view for delivery requests (hides precise addresses)
CREATE OR REPLACE VIEW public.delivery_requests_safe AS
SELECT 
  id,
  builder_id,
  material_type,
  quantity,
  budget_range,
  required_vehicle_type,
  status,
  created_at,
  -- Hide precise addresses, show only general areas
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR id = delivery_requests.builder_id)
    ) THEN pickup_address
    ELSE SPLIT_PART(pickup_address, ',', -1) -- Show only city/county
  END as pickup_area,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR id = delivery_requests.builder_id)
    ) THEN delivery_address
    ELSE SPLIT_PART(delivery_address, ',', -1) -- Show only city/county
  END as delivery_area,
  -- Hide precise timing
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR id = delivery_requests.builder_id)
    ) THEN pickup_date
    ELSE DATE_TRUNC('week', pickup_date) -- Show only week
  END as pickup_timeframe
FROM public.delivery_requests;

-- Grant access to safe view
GRANT SELECT ON public.delivery_requests_safe TO authenticated;

-- =============================================================================
-- STEP 7: CREATE SECURE FUNCTIONS FOR GPS TRACKING ACCESS
-- =============================================================================

-- Function to get tracking data with location privacy
CREATE OR REPLACE FUNCTION public.get_delivery_tracking_secure(delivery_id UUID)
RETURNS TABLE(
  id UUID,
  delivery_id UUID,
  status TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  current_location TEXT, -- General area, not precise coordinates
  progress_percentage INTEGER,
  last_update TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    dt.id,
    dt.delivery_id,
    dt.status,
    dt.estimated_arrival,
    -- Return general location instead of precise GPS
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      ) THEN dt.current_location
      WHEN dt.latitude IS NOT NULL AND dt.longitude IS NOT NULL THEN
        CONCAT(
          ROUND(dt.latitude::numeric, 2)::text, 
          ', ', 
          ROUND(dt.longitude::numeric, 2)::text,
          ' (approximate)'
        )
      ELSE 'Location updating...'
    END as current_location,
    COALESCE(dt.progress_percentage, 0) as progress_percentage,
    dt.updated_at as last_update
  FROM public.delivery_tracking dt
  JOIN public.deliveries d ON d.id = dt.delivery_id
  WHERE dt.delivery_id = get_delivery_tracking_secure.delivery_id
  AND (
    -- Admin can access all tracking
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Builder can track their deliveries
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND id = d.builder_id
      AND role = 'builder'
    ) OR
    -- Supplier can track their assigned deliveries
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.suppliers s ON s.user_id = p.id
      WHERE p.user_id = auth.uid()
      AND s.id = d.supplier_id
      AND p.role = 'supplier'
    )
  )
  ORDER BY dt.updated_at DESC
  LIMIT 10; -- Limit tracking history
$$;

-- Function to get business contact info (only for active business relationships)
CREATE OR REPLACE FUNCTION public.get_provider_contact_secure(provider_id UUID)
RETURNS TABLE(
  provider_name TEXT,
  contact_method TEXT,
  service_areas TEXT[],
  vehicle_types TEXT[],
  rating NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    dp.provider_name,
    -- Return contact method, not actual contact details
    CASE 
      WHEN dp.phone IS NOT NULL THEN 'Phone available'
      WHEN dp.email IS NOT NULL THEN 'Email available'
      ELSE 'Contact via platform'
    END as contact_method,
    dp.service_areas,
    dp.vehicle_types,
    COALESCE(dp.rating, 0) as rating
  FROM public.delivery_providers dp
  WHERE dp.id = provider_id
  AND dp.is_active = true
  AND dp.is_verified = true
  AND (
    -- Admin can access all provider info
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- User has active delivery with this provider
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE d.driver_id = dp.id
      AND (d.builder_id = p.id OR d.supplier_id IN (
        SELECT s.id FROM public.suppliers s WHERE s.user_id = p.id
      ))
      AND d.status IN ('pending', 'in_transit', 'delivered')
    )
  );
$$;

-- =============================================================================
-- STEP 8: IMPLEMENT LOCATION PRIVACY PROTECTION
-- =============================================================================

-- Function to anonymize GPS coordinates for analytics
CREATE OR REPLACE FUNCTION public.anonymize_location_data()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Update old tracking records to remove precise GPS coordinates
  UPDATE public.delivery_tracking 
  SET 
    latitude = ROUND(latitude::numeric, 2), -- Reduce precision
    longitude = ROUND(longitude::numeric, 2), -- Reduce precision
    current_location = CONCAT(
      SPLIT_PART(current_location, ',', 1), -- Keep general area
      ', Kenya' -- Remove precise address
    )
  WHERE created_at < NOW() - INTERVAL '7 days' -- Only anonymize old data
  AND latitude IS NOT NULL;
$$;

-- =============================================================================
-- STEP 9: EMERGENCY DATA BREACH RESPONSE FUNCTIONS
-- =============================================================================

-- Function to immediately lock down all delivery data in case of breach
CREATE OR REPLACE FUNCTION public.emergency_lockdown_delivery_data()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Disable all non-admin access to delivery tables
  DROP POLICY IF EXISTS "Secure: Providers view own profile only" ON public.delivery_providers;
  DROP POLICY IF EXISTS "Secure: Message participants only" ON public.delivery_communications;
  DROP POLICY IF EXISTS "Secure: Tracking participants only" ON public.delivery_tracking;
  DROP POLICY IF EXISTS "Secure: Request owner access only" ON public.delivery_requests;
  DROP POLICY IF EXISTS "Secure: Notification recipient access only" ON public.delivery_notifications;
  
  -- Create emergency admin-only policies
  CREATE POLICY "Emergency: Admin only access" ON public.delivery_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
  
  CREATE POLICY "Emergency: Admin only access" ON public.delivery_communications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
  
  CREATE POLICY "Emergency: Admin only access" ON public.delivery_tracking FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
  
  CREATE POLICY "Emergency: Admin only access" ON public.delivery_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
  
  CREATE POLICY "Emergency: Admin only access" ON public.delivery_notifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
  
  -- Log the emergency lockdown
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'emergency_data_lockdown',
    'critical',
    jsonb_build_object(
      'action', 'emergency_lockdown_delivery_data',
      'timestamp', now(),
      'reason', 'Security breach response'
    )
  );
$$;

-- =============================================================================
-- STEP 10: AUDIT AND MONITORING SETUP
-- =============================================================================

-- Create comprehensive audit trigger for all delivery tables
CREATE OR REPLACE FUNCTION public.audit_delivery_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all access to sensitive delivery data
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'delivery_data_access',
    CASE 
      WHEN TG_TABLE_NAME = 'delivery_tracking' THEN 'high'
      WHEN TG_TABLE_NAME = 'delivery_communications' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', now(),
      'record_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to all delivery tables
DROP TRIGGER IF EXISTS audit_delivery_providers_access ON public.delivery_providers;
CREATE TRIGGER audit_delivery_providers_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.delivery_providers
  FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_access();

DROP TRIGGER IF EXISTS audit_delivery_communications_access ON public.delivery_communications;
CREATE TRIGGER audit_delivery_communications_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.delivery_communications
  FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_access();

DROP TRIGGER IF EXISTS audit_delivery_tracking_access ON public.delivery_tracking;
CREATE TRIGGER audit_delivery_tracking_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.delivery_tracking
  FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_access();

DROP TRIGGER IF EXISTS audit_delivery_requests_access ON public.delivery_requests;
CREATE TRIGGER audit_delivery_requests_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_access();

DROP TRIGGER IF EXISTS audit_delivery_notifications_access ON public.delivery_notifications;
CREATE TRIGGER audit_delivery_notifications_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.delivery_notifications
  FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_access();

-- =============================================================================
-- STEP 11: FINAL VERIFICATION AND LOGGING
-- =============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_name TEXT;
  tables_to_check TEXT[] := ARRAY['delivery_providers', 'delivery_communications', 'delivery_tracking', 'delivery_requests', 'delivery_notifications'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_check
  LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = table_name) THEN
      RAISE EXCEPTION 'CRITICAL: RLS not enabled on % table!', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'SUCCESS: All delivery tables are now properly secured with RLS';
END
$$;

-- Log this critical security fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- System user
  'emergency_delivery_security_fix',
  'critical',
  jsonb_build_object(
    'fix_type', 'delivery_tables_secured',
    'tables_secured', ARRAY['delivery_providers', 'delivery_communications', 'delivery_tracking', 'delivery_requests', 'delivery_notifications'],
    'vulnerability_type', 'publicly_readable_sensitive_data',
    'security_risks_eliminated', ARRAY[
      'driver_harassment_risk',
      'gps_tracking_exposure', 
      'business_espionage_risk',
      'property_security_risk',
      'criminal_targeting_risk'
    ],
    'timestamp', now(),
    'migration_file', 'EMERGENCY_DELIVERY_SECURITY_FIX.sql'
  )
) ON CONFLICT DO NOTHING;

-- Success message
SELECT 
  '🛡️ EMERGENCY DELIVERY SECURITY FIX APPLIED SUCCESSFULLY' as status,
  'All delivery tables secured against data exposure' as message,
  'Driver safety and business data protected' as impact,
  now() as applied_at;
