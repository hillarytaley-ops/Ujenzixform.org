-- ============================================================================
-- COMPREHENSIVE SECURITY FIX FOR PROFILES, SUPPLIERS, AND CAMERAS
-- Addresses: PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA, MISSING_RLS_PROTECTION
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE SECURITY - Fix PUBLIC_USER_DATA vulnerability
-- ============================================================================

-- Drop ALL existing policies on profiles to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- Create security definer function to check business relationships
CREATE OR REPLACE FUNCTION public.has_verified_business_relationship_with_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM supplier_business_relationships sbr
    JOIN profiles p ON p.id = target_profile_id
    WHERE sbr.requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND sbr.admin_approved = true
      AND sbr.expires_at > now()
    UNION
    SELECT 1 FROM purchase_orders po
    WHERE (po.buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) 
           OR po.supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
      AND (po.buyer_id = target_profile_id OR po.supplier_id = target_profile_id)
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > (now() - INTERVAL '30 days')
  );
$$;

-- Strict RLS policies for profiles
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

-- Drop ALL existing policies on suppliers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'suppliers' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.suppliers';
    END LOOP;
END $$;

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

-- Update get_supplier_contact_secure function
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
  is_admin boolean;
  has_relationship boolean;
  is_owner boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  SELECT has_verified_supplier_relationship(supplier_uuid) INTO has_relationship;
  SELECT user_id = auth.uid() FROM suppliers WHERE id = supplier_uuid INTO is_owner;
  
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'contact_request',
    has_relationship,
    (is_admin OR has_relationship OR is_owner),
    CASE
      WHEN is_admin THEN 'Admin access'
      WHEN is_owner THEN 'Owner access'
      WHEN has_relationship THEN 'Verified business relationship'
      ELSE 'DENIED'
    END,
    CASE WHEN (is_admin OR has_relationship OR is_owner) THEN 'low' ELSE 'critical' END
  );
  
  IF is_admin OR has_relationship OR is_owner THEN
    RETURN QUERY
    SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true, CASE WHEN is_admin THEN 'Admin' WHEN is_owner THEN 'Owner' ELSE 'Verified' END
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY
    SELECT supplier_uuid, 'Protected'::text, 'Protected'::text, 'Protected'::text,
      'Protected'::text, 'Protected'::text, false,
      'Contact information requires verified business relationship'::text;
  END IF;
END;
$$;

-- ============================================================================
-- 3. CAMERAS TABLE SECURITY - Fix MISSING_RLS_PROTECTION vulnerability
-- ============================================================================

-- Ensure cameras table exists
CREATE TABLE IF NOT EXISTS public.cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  stream_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on cameras
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cameras' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.cameras';
    END LOOP;
END $$;

-- Admin full access
CREATE POLICY "cameras_admin_full_access"
ON public.cameras
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Project builders can access their own cameras
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

-- Block anonymous access
CREATE POLICY "cameras_block_anonymous"
ON public.cameras
FOR ALL
TO anon
USING (false);

-- Secure camera stream access function
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
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM cameras c
    JOIN projects p ON p.id = c.project_id
    JOIN profiles prof ON prof.id = p.builder_id
    WHERE c.id = camera_uuid AND prof.user_id = auth.uid()
  ) INTO is_project_builder;
  
  INSERT INTO camera_access_log (user_id, camera_id, access_type, authorized)
  VALUES (auth.uid(), camera_uuid, 'stream_access_request', (is_admin OR is_project_builder));
  
  IF is_admin OR is_project_builder THEN
    RETURN QUERY
    SELECT c.id, c.name, c.stream_url, true,
      CASE WHEN is_admin THEN 'Admin access' ELSE 'Builder access' END
    FROM cameras c WHERE c.id = camera_uuid;
  ELSE
    RETURN QUERY
    SELECT camera_uuid, 'Protected'::text, 'Access denied'::text, false,
      'Only project builders and admins can access streams'::text;
  END IF;
END;
$$;

-- Log security update
INSERT INTO security_events (event_type, severity, details)
VALUES (
  'security_policies_updated',
  'high',
  jsonb_build_object(
    'tables', ARRAY['profiles', 'suppliers', 'cameras'],
    'fixes', ARRAY['PUBLIC_USER_DATA', 'EXPOSED_SENSITIVE_DATA', 'MISSING_RLS_PROTECTION']
  )
);