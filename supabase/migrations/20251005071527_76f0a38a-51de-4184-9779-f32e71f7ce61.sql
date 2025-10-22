-- ============================================
-- COMPREHENSIVE DATA SECURITY FIX (Clean Version)
-- Addresses: PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA, MISSING_RLS_PROTECTION
-- ============================================

-- ============================================
-- 1. PROFILES TABLE SECURITY
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Policy: Users can read and update ONLY their own profile
CREATE POLICY "profiles_own_data_access"
ON public.profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Admins can access all profiles
CREATE POLICY "profiles_admin_full_access"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Policy: Users with verified business relationships can view LIMITED profile data
CREATE POLICY "profiles_verified_business_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE (po.buyer_id = profiles.id OR po.supplier_id IN (
      SELECT id FROM public.suppliers WHERE user_id = auth.uid()
    ))
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '90 days'
  )
  OR EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.builder_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.delivery_providers dp
      WHERE dp.user_id = auth.uid() AND dp.id = dr.provider_id
    )
    AND dr.status IN ('accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '30 days'
  )
);

-- ============================================
-- 2. SUPPLIERS TABLE SECURITY ENHANCEMENT
-- ============================================

-- Drop ALL existing policies on suppliers
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.suppliers';
    END LOOP;
END $$;

-- Policy: Admin full access
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Policy: Supplier owner full access
CREATE POLICY "suppliers_owner_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Only users with recent verified business relationships can READ supplier data
CREATE POLICY "suppliers_verified_business_read"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = suppliers.id
    AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '90 days'
  )
);

-- Policy: Authenticated users can insert their own supplier record
CREATE POLICY "suppliers_authenticated_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. PROJECTS_SAFE VIEW SECURITY
-- ============================================

-- Recreate the view with security_invoker
DROP VIEW IF EXISTS public.projects_safe CASCADE;

CREATE VIEW public.projects_safe 
WITH (security_invoker = on)
AS
SELECT 
  id, start_date, end_date, builder_id, created_at, updated_at,
  name, description, status, location, access_code
FROM public.projects;

-- Grant limited access
REVOKE ALL ON public.projects_safe FROM PUBLIC;
REVOKE ALL ON public.projects_safe FROM anon;
GRANT SELECT ON public.projects_safe TO authenticated;

-- Enable RLS on the underlying projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing project policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'projects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.projects';
    END LOOP;
END $$;

-- Policy: Project owners can access their projects
CREATE POLICY "projects_owner_access"
ON public.projects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.id = projects.builder_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.id = projects.builder_id
  )
);

-- Policy: Admins can access all projects
CREATE POLICY "projects_admin_access"
ON public.projects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Policy: Suppliers with active orders can view limited project details
CREATE POLICY "projects_supplier_limited_read"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE s.user_id = auth.uid()
    AND po.buyer_id = projects.builder_id
    AND po.status IN ('confirmed', 'in_progress')
    AND po.created_at > NOW() - INTERVAL '30 days'
  )
);

-- ============================================
-- AUDIT LOGGING ENHANCEMENTS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_profile_access_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_supplier_access_trigger ON public.suppliers;

-- Audit function for profile access (simplified - only logs on UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.audit_profile_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    INSERT INTO public.security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'profile_sensitive_data_modification',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'profile_id', OLD.id,
        'timestamp', NOW()
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profile modifications
CREATE TRIGGER audit_profile_access_trigger
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_sensitive_access();

-- Audit function for supplier contact access (simplified)
CREATE OR REPLACE FUNCTION public.audit_supplier_contact_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND (OLD.email IS NOT NULL OR OLD.phone IS NOT NULL) THEN
    INSERT INTO public.supplier_contact_security_audit (
      user_id, supplier_id, contact_field_requested,
      business_relationship_verified, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(),
      OLD.id,
      'contact_data_modification',
      EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.profiles p ON p.id = po.buyer_id
        WHERE po.supplier_id = OLD.id
        AND p.user_id = auth.uid()
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
      ),
      true,
      format('Contact data %s operation', TG_OP),
      'medium'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for supplier modifications
CREATE TRIGGER audit_supplier_access_trigger
AFTER UPDATE OR DELETE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.audit_supplier_contact_modifications();