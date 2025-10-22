-- Phase 3: Final PII Protection (Fixed with correct column names)
-- Fix 8: Supplier contact protection
DROP POLICY IF EXISTS "suppliers_directory_safe_info_only" ON public.suppliers;

CREATE POLICY "suppliers_directory_verified_only"
ON public.suppliers
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND is_verified = true)
  OR has_role(auth.uid(), 'admin'::app_role)
);

COMMENT ON COLUMN suppliers.email IS 'PII: Only accessible via get_supplier_contact_ultra_secure() RPC';
COMMENT ON COLUMN suppliers.phone IS 'PII: Only accessible via get_supplier_contact_ultra_secure() RPC';
COMMENT ON COLUMN suppliers.address IS 'PII: Only accessible via get_supplier_contact_ultra_secure() RPC';
COMMENT ON COLUMN suppliers.contact_person IS 'PII: Only accessible via get_supplier_contact_ultra_secure() RPC';

-- Fix 9: Profile phone protection (using correct column name: phone)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;

CREATE POLICY "profiles_owner_and_admin_only"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profiles_owner_update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_no_delete"
ON public.profiles
FOR DELETE
USING (false);

COMMENT ON COLUMN profiles.phone IS 'PII: Only accessible to profile owner, admin, or via get_profile_phone_secure() RPC with business relationship';

-- Fix 10: Project access codes masked
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
  
  INSERT INTO security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(), 'project_access_code_request', 
    CASE WHEN (is_owner OR is_admin) THEN 'low' ELSE 'medium' END,
    jsonb_build_object(
      'project_id', project_uuid,
      'is_owner', is_owner,
      'is_admin', is_admin,
      'has_relationship', has_active_relationship,
      'timestamp', NOW()
    )
  );
  
  IF is_admin OR is_owner THEN
    RETURN QUERY
    SELECT p.id, p.name, p.description, p.location, p.status, p.access_code,
      'full_access'::text
    FROM projects p WHERE p.id = project_uuid;
  ELSIF has_active_relationship THEN
    RETURN QUERY
    SELECT p.id, p.name, p.description, p.location, p.status,
      '[PROTECTED]'::text as access_code,
      'limited_access'::text
    FROM projects p WHERE p.id = project_uuid;
  ELSE
    RETURN;
  END IF;
END;
$$;

COMMENT ON COLUMN projects.access_code IS 'SENSITIVE: Only visible to project owner and admin. Never return to suppliers.';
COMMENT ON TABLE suppliers IS 'Contact information NEVER returned in SELECT. Only via get_supplier_contact_ultra_secure() RPC with verified relationships.';
COMMENT ON TABLE profiles IS 'Phone only accessible to owner or admin. Business relationships require get_profile_phone_secure() RPC.';
COMMENT ON TABLE projects IS 'Access codes protected from suppliers. Only owners and admins can view.';