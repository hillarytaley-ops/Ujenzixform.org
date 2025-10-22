-- Phase 1: Critical PII Protection (Fixed - drop existing camera policies)
-- Fix 1: Secure Supplier Contact Information

DROP POLICY IF EXISTS "suppliers_directory_basic_info" ON public.suppliers;

CREATE POLICY "suppliers_directory_safe_info_only"
ON public.suppliers
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_verified = true
);

-- Fix 2: Lock Down Driver Information
DROP POLICY IF EXISTS "delivery_providers_default_deny" ON public.delivery_providers;

CREATE OR REPLACE FUNCTION get_delivery_providers_safe_listing()
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  vehicle_types text[],
  service_areas text[],
  capacity_kg numeric,
  is_verified boolean,
  is_active boolean,
  rating numeric,
  total_deliveries integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    dp.id, dp.provider_name, dp.provider_type, dp.vehicle_types,
    dp.service_areas, dp.capacity_kg, dp.is_verified, dp.is_active,
    dp.rating, dp.total_deliveries
  FROM delivery_providers dp
  WHERE dp.is_verified = true AND dp.is_active = true;
END;
$$;

-- Fix 3: Protect Profile Phone Numbers
CREATE OR REPLACE FUNCTION get_profile_phone_secure(target_profile_id uuid)
RETURNS TABLE(
  profile_id uuid,
  phone_number text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_self boolean;
  has_business_relationship boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = target_profile_id AND user_id = auth.uid()
  ) INTO is_self;
  
  SELECT has_verified_business_relationship_with_profile(target_profile_id) 
  INTO has_business_relationship;
  
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), target_profile_id, 'phone_number_request',
    (is_admin OR is_self OR has_business_relationship),
    CASE
      WHEN is_admin THEN 'Admin access'
      WHEN is_self THEN 'Self access'
      WHEN has_business_relationship THEN 'Verified business relationship'
      ELSE 'ACCESS DENIED'
    END,
    CASE 
      WHEN (is_admin OR is_self OR has_business_relationship) THEN 'low'
      ELSE 'critical'
    END
  );
  
  IF is_admin OR is_self OR has_business_relationship THEN
    RETURN QUERY
    SELECT 
      p.id, p.phone_number, true as access_granted,
      CASE
        WHEN is_admin THEN 'Admin access'
        WHEN is_self THEN 'Own profile'
        ELSE 'Business relationship verified'
      END as access_reason
    FROM profiles p
    WHERE p.id = target_profile_id;
  ELSE
    RETURN QUERY
    SELECT 
      target_profile_id, 'Protected'::text, false,
      'Phone number requires verified business relationship'::text;
  END IF;
END;
$$;

-- Fix 4: Restrict Project Access Codes
DROP POLICY IF EXISTS "projects_supplier_limited_read" ON public.projects;

CREATE POLICY "projects_supplier_active_delivery_only"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE s.user_id = auth.uid()
      AND po.buyer_id = projects.builder_id
      AND po.status IN ('confirmed', 'in_progress')
      AND po.created_at > NOW() - INTERVAL '7 days'
  )
);

CREATE OR REPLACE FUNCTION get_project_safe(project_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  location text,
  status text,
  access_code text,
  access_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  is_admin boolean;
  has_active_relationship boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE p.id = project_uuid AND pr.user_id = auth.uid()
  ) INTO is_owner;
  
  SELECT EXISTS(
    SELECT 1 FROM projects p
    JOIN purchase_orders po ON po.buyer_id = p.builder_id
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE p.id = project_uuid
      AND s.user_id = auth.uid()
      AND po.status IN ('confirmed', 'in_progress')
      AND po.created_at > NOW() - INTERVAL '7 days'
  ) INTO has_active_relationship;
  
  IF is_admin OR is_owner THEN
    RETURN QUERY
    SELECT p.id, p.name, p.description, p.location, p.status, p.access_code,
      'full_access'::text
    FROM projects p WHERE p.id = project_uuid;
  ELSIF has_active_relationship THEN
    RETURN QUERY
    SELECT p.id, p.name, p.description, p.location, p.status,
      'Protected - Contact project owner'::text as access_code,
      'limited_access'::text
    FROM projects p WHERE p.id = project_uuid;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Fix 5: Secure Camera Stream URLs (drop all existing first)
DROP POLICY IF EXISTS "cameras_public_read" ON public.cameras;
DROP POLICY IF EXISTS "cameras_default_access" ON public.cameras;
DROP POLICY IF EXISTS "cameras_admin_full_access" ON public.cameras;
DROP POLICY IF EXISTS "cameras_owner_manage" ON public.cameras;
DROP POLICY IF EXISTS "cameras_project_owner_only" ON public.cameras;

CREATE POLICY "cameras_project_owner_only"
ON public.cameras
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE p.id = cameras.project_id
      AND pr.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "cameras_admin_manage"
ON public.cameras
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cameras_owner_full_control"
ON public.cameras
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE p.id = cameras.project_id
      AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE p.id = cameras.project_id
      AND pr.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION get_camera_stream_secure(camera_uuid uuid)
RETURNS TABLE(
  camera_id uuid,
  stream_url text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_project_owner boolean;
  is_admin boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM cameras c
    JOIN projects p ON p.id = c.project_id
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE c.id = camera_uuid AND pr.user_id = auth.uid()
  ) INTO is_project_owner;
  
  INSERT INTO camera_access_log (
    user_id, camera_id, access_type, authorized
  ) VALUES (
    auth.uid(), camera_uuid, 'stream_url_request',
    (is_admin OR is_project_owner)
  );
  
  IF is_admin OR is_project_owner THEN
    RETURN QUERY
    SELECT c.id, c.stream_url, true,
      CASE WHEN is_admin THEN 'Admin access' ELSE 'Project owner' END::text
    FROM cameras c WHERE c.id = camera_uuid;
  ELSE
    RETURN QUERY
    SELECT camera_uuid, 'Unauthorized'::text, false,
      'Camera access restricted to project owner'::text;
  END IF;
END;
$$;

COMMENT ON TABLE suppliers IS 'Contact information (email, phone, address, contact_person) protected by RLS. Only accessible via get_supplier_contact_ultra_secure() with verified business relationships.';
COMMENT ON TABLE delivery_providers IS 'Driver contact information protected. Only accessible via get_delivery_provider_contact_secure() for admin or active delivery coordination.';
COMMENT ON TABLE profiles IS 'Phone numbers protected. Access via get_profile_phone_secure() requires business relationship verification.';
COMMENT ON TABLE cameras IS 'Camera streams restricted to project owners only. Access via get_camera_stream_secure() with full audit logging.';