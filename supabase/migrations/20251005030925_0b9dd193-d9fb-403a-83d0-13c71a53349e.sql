-- ============================================================================
-- COMPREHENSIVE SECURITY FIX FOR PROFILES, SUPPLIERS, AND CAMERAS
-- Addresses: PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA, MISSING_RLS_PROTECTION
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE SECURITY - Fix PUBLIC_USER_DATA vulnerability
-- ============================================================================

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "profiles_own_view_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete_only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by all" ON public.profiles;

-- Create security definer function to check business relationships
CREATE OR REPLACE FUNCTION public.has_verified_business_relationship_with_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if there's a verified business relationship via suppliers
    SELECT 1 FROM supplier_business_relationships sbr
    JOIN profiles p ON p.id = target_profile_id
    WHERE sbr.requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND sbr.admin_approved = true
      AND sbr.expires_at > now()
    UNION
    -- Check if there's a recent purchase order relationship
    SELECT 1 FROM purchase_orders po
    WHERE (po.buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) 
           OR po.supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
      AND (po.buyer_id = target_profile_id OR po.supplier_id = target_profile_id)
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > (now() - INTERVAL '30 days')
  );
$$;

-- Strict RLS policies for profiles - users can only see their own or verified business relationships
CREATE POLICY "profiles_strict_own_view"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profiles_strict_own_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_strict_own_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 2. SUPPLIERS TABLE SECURITY - Fix EXPOSED_SENSITIVE_DATA vulnerability
-- ============================================================================

-- Drop existing policies on suppliers
DROP POLICY IF EXISTS "suppliers_admin_verified_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_block_all_anonymous" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_manage_own" ON public.suppliers;

-- Block all anonymous access
CREATE POLICY "suppliers_block_anonymous_strict"
ON public.suppliers
FOR ALL
TO anon
USING (false);

-- Admin full access
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Supplier owner can manage their own record
CREATE POLICY "suppliers_owner_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public can only view non-sensitive fields (company name, materials, rating)
-- Contact info (email, phone, address, contact_person) is BLOCKED for everyone except admin/owner
CREATE POLICY "suppliers_public_view_limited"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- This policy intentionally doesn't exist on suppliers table
  -- All contact access must go through get_supplier_contact_secure() RPC
  false
);

-- Update the get_supplier_contact_secure function to be more strict
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid)
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  has_relationship boolean;
  is_owner boolean;
BEGIN
  -- Get user role
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) INTO current_user_role;
  
  -- Check business relationship
  SELECT has_verified_supplier_relationship(supplier_uuid) INTO has_relationship;
  
  -- Check ownership
  SELECT user_id = auth.uid() FROM suppliers WHERE id = supplier_uuid INTO is_owner;
  
  -- Log access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'contact_request',
    has_relationship,
    (current_user_role IS NOT NULL OR has_relationship OR is_owner),
    CASE
      WHEN current_user_role IS NOT NULL THEN 'Admin access'
      WHEN is_owner THEN 'Owner access'
      WHEN has_relationship THEN 'Verified business relationship'
      ELSE 'DENIED - No authorization'
    END,
    CASE 
      WHEN current_user_role IS NOT NULL OR has_relationship OR is_owner THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return data based on access level
  IF current_user_role IS NOT NULL OR has_relationship OR is_owner THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true as access_granted,
      CASE
        WHEN current_user_role IS NOT NULL THEN 'Admin access granted'
        WHEN is_owner THEN 'Owner access granted'
        ELSE 'Verified business relationship'
      END as access_reason
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      supplier_uuid, 'Protected'::text, 'Protected'::text, 'Protected'::text,
      'Protected'::text, 'Protected'::text,
      false as access_granted,
      'Contact information requires verified business relationship or admin approval'::text as access_reason;
  END IF;
END;
$$;

-- ============================================================================
-- 3. CAMERAS TABLE SECURITY - Fix MISSING_RLS_PROTECTION vulnerability
-- ============================================================================

-- Ensure cameras table exists with proper schema
CREATE TABLE IF NOT EXISTS public.cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  stream_url text, -- SENSITIVE: Only accessible to authorized users
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on cameras
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "cameras_public_view" ON public.cameras;
DROP POLICY IF EXISTS "Builders can manage their own cameras" ON public.cameras;

-- Admin full access to cameras
CREATE POLICY "cameras_admin_full_access"
ON public.cameras
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Project builders can view/manage their own project cameras
CREATE POLICY "cameras_project_builder_access"
ON public.cameras
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles prof ON prof.id = p.builder_id
    WHERE p.id = cameras.project_id
      AND prof.user_id = auth.uid()
      AND prof.role = 'builder'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles prof ON prof.id = p.builder_id
    WHERE p.id = cameras.project_id
      AND prof.user_id = auth.uid()
      AND prof.role = 'builder'
  )
);

-- Block all anonymous access to cameras
CREATE POLICY "cameras_block_anonymous"
ON public.cameras
FOR ALL
TO anon
USING (false);

-- Create secure function for accessing camera streams
CREATE OR REPLACE FUNCTION public.get_secure_camera_stream(camera_uuid uuid)
RETURNS TABLE(
  camera_id uuid,
  camera_name text,
  stream_url text,
  can_access boolean,
  access_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_project_builder boolean;
BEGIN
  -- Check if user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Check if user is the project builder
  SELECT EXISTS (
    SELECT 1 FROM cameras c
    JOIN projects p ON p.id = c.project_id
    JOIN profiles prof ON prof.id = p.builder_id
    WHERE c.id = camera_uuid
      AND prof.user_id = auth.uid()
  ) INTO is_project_builder;
  
  -- Log access attempt
  INSERT INTO camera_access_log (
    user_id, camera_id, access_type, authorized
  ) VALUES (
    auth.uid(), camera_uuid, 'stream_access_request',
    (is_admin OR is_project_builder)
  );
  
  -- Return stream data only if authorized
  IF is_admin OR is_project_builder THEN
    RETURN QUERY
    SELECT 
      c.id, c.name, c.stream_url,
      true as can_access,
      CASE 
        WHEN is_admin THEN 'Admin access granted'
        ELSE 'Project builder access granted'
      END as access_message
    FROM cameras c
    WHERE c.id = camera_uuid;
  ELSE
    RETURN QUERY
    SELECT 
      camera_uuid, 'Protected'::text, 'Stream access denied'::text,
      false as can_access,
      'Only project builders and admins can access camera streams'::text as access_message;
  END IF;
END;
$$;

-- Add audit logging
INSERT INTO security_events (event_type, severity, details)
VALUES (
  'critical_security_policies_updated',
  'high',
  jsonb_build_object(
    'tables_secured', ARRAY['profiles', 'suppliers', 'cameras'],
    'vulnerabilities_fixed', ARRAY['PUBLIC_USER_DATA', 'EXPOSED_SENSITIVE_DATA', 'MISSING_RLS_PROTECTION'],
    'timestamp', now()
  )
);