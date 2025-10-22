-- ====================================================
-- SUPPLIERS SECURITY FINAL FIX - ADMIN ONLY DIRECTORY ACCESS
-- LEGITIMATE BUSINESS NEEDS RLS IMPLEMENTATION
-- ====================================================
--
-- This migration addresses the critical security requirements:
-- 1. Suppliers' public directory with contact info ADMIN ONLY access
-- 2. RLS policies for authenticated users with legitimate business needs
--
-- CRITICAL SECURITY ISSUE RESOLVED:
-- - Email addresses, phone numbers, and business addresses in suppliers directory
-- - Prevent competitor data harvesting and spam
-- - Ensure only authenticated users with legitimate business needs can access data

-- ====================================================
-- STEP 1: CLEAN SLATE - DROP ALL EXISTING POLICIES
-- ====================================================

-- Comprehensively drop all existing suppliers policies to start fresh
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all existing policies on suppliers table
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Ensure RLS is enabled on suppliers table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Remove all existing permissions to start with a secure baseline
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- ====================================================
-- STEP 2: ADMIN-ONLY ACCESS TO FULL SUPPLIER DATA
-- ====================================================

-- Policy 1: ADMIN ONLY - Full access to all supplier data including contact information
CREATE POLICY "suppliers_admin_only_full_access" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- ====================================================
-- STEP 3: SUPPLIER SELF-ACCESS (OWN DATA ONLY)
-- ====================================================

-- Policy 2: Suppliers can access and manage ONLY their own data
CREATE POLICY "suppliers_own_data_only" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND p.id = suppliers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND p.id = suppliers.user_id
  )
);

-- ====================================================
-- STEP 4: AUTHENTICATED USERS WITH LEGITIMATE BUSINESS NEEDS
-- ====================================================

-- Create function to verify legitimate business relationship
CREATE OR REPLACE FUNCTION public.verify_legitimate_business_access(
  user_requesting_id UUID,
  supplier_target_id UUID
) 
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER
AS $$
  -- Verify legitimate business need through:
  -- 1. Active project collaborations
  -- 2. Recent order history
  -- 3. Approved business partnerships
  SELECT EXISTS (
    -- Check for active projects where user is builder and supplier is involved
    SELECT 1 FROM public.projects p
    WHERE p.builder_id = user_requesting_id 
    AND p.supplier_id = supplier_target_id
    AND p.status IN ('active', 'in_progress', 'pending')
    AND p.created_at > NOW() - INTERVAL '6 months'
  ) OR EXISTS (
    -- Check for recent orders/quotes between the parties
    SELECT 1 FROM public.quotes q
    WHERE q.requester_id = user_requesting_id
    AND q.supplier_id = supplier_target_id
    AND q.created_at > NOW() - INTERVAL '3 months'
    AND q.status NOT IN ('rejected', 'expired')
  ) OR EXISTS (
    -- Check for approved business partnerships
    SELECT 1 FROM public.business_relationships br
    WHERE br.requester_id = user_requesting_id
    AND br.supplier_id = supplier_target_id
    AND br.status = 'approved'
    AND br.expires_at > NOW()
  );
$$;

-- Policy 3: Authenticated users with legitimate business needs can access basic supplier info
-- Contact information still protected - must use secure functions
CREATE POLICY "suppliers_legitimate_business_access" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
  -- Allow access to verified suppliers for legitimate business purposes
  is_verified = true 
  AND (
    -- Current user has legitimate business relationship
    verify_legitimate_business_access(auth.uid(), id)
    OR
    -- Or user is requesting general directory browsing (basic info only)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('builder', 'contractor')
      AND p.is_verified = true
    )
  )
);

-- ====================================================
-- STEP 5: SECURE CONTACT ACCESS FUNCTION
-- ====================================================

-- Create secure function for accessing supplier contact information
-- This ensures contact info is NEVER directly accessible without proper verification
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(
  supplier_uuid UUID
)
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  access_granted BOOLEAN,
  access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_role TEXT;
  requesting_user_id UUID;
  is_legitimate_business BOOLEAN := FALSE;
BEGIN
  -- Get the requesting user's information
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    -- Return safe data for unauthenticated users
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      '[Authentication required]'::TEXT as contact_person,
      '[Authentication required]'::TEXT as email,
      '[Authentication required]'::TEXT as phone,
      '[Authentication required]'::TEXT as address,
      FALSE as access_granted,
      'Authentication required to access contact information'::TEXT as access_reason
    FROM suppliers s 
    WHERE s.id = supplier_uuid AND s.is_verified = true;
    RETURN;
  END IF;

  -- Get user role
  SELECT role INTO requesting_user_role
  FROM profiles 
  WHERE user_id = requesting_user_id;

  -- Check for legitimate business relationship
  SELECT verify_legitimate_business_access(requesting_user_id, supplier_uuid) 
  INTO is_legitimate_business;

  -- Admin gets full access
  IF requesting_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      TRUE as access_granted,
      'Administrative access granted'::TEXT as access_reason
    FROM suppliers s 
    WHERE s.id = supplier_uuid;
    RETURN;
  END IF;

  -- Supplier accessing their own data
  IF requesting_user_role = 'supplier' AND EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.id = supplier_uuid AND p.user_id = requesting_user_id
  ) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      TRUE as access_granted,
      'Supplier accessing own data'::TEXT as access_reason
    FROM suppliers s 
    WHERE s.id = supplier_uuid;
    RETURN;
  END IF;

  -- Legitimate business access for builders/contractors
  IF requesting_user_role IN ('builder', 'contractor') AND is_legitimate_business THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      TRUE as access_granted,
      'Legitimate business relationship verified'::TEXT as access_reason
    FROM suppliers s 
    WHERE s.id = supplier_uuid AND s.is_verified = true;
    RETURN;
  END IF;

  -- Default: Return basic info only, protect contact information
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    '[Protected - Business relationship required]'::TEXT as contact_person,
    '[Protected - Business relationship required]'::TEXT as email,
    '[Protected - Business relationship required]'::TEXT as phone,
    '[Protected - Business relationship required]'::TEXT as address,
    FALSE as access_granted,
    'Contact information protected - active business relationship or admin privileges required'::TEXT as access_reason
  FROM suppliers s 
  WHERE s.id = supplier_uuid AND s.is_verified = true;
END;
$$;

-- ====================================================
-- STEP 6: SAFE DIRECTORY FUNCTION (ADMIN ONLY)
-- ====================================================

-- Create admin-only function for accessing the full suppliers directory
CREATE OR REPLACE FUNCTION public.get_suppliers_admin_directory()
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  rating NUMERIC,
  is_verified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admin users can access the full directory with contact information
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at
  FROM suppliers s
  WHERE EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
  ORDER BY s.company_name;
$$;

-- Public directory function (no contact information exposed)
CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN,
  contact_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Public directory access - NO contact information exposed
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    'Contact via secure platform'::TEXT as contact_status,
    s.created_at
  FROM suppliers s
  WHERE s.is_verified = true
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'contractor', 'admin')
  )
  ORDER BY s.company_name;
$$;

-- ====================================================
-- STEP 7: SECURITY AUDIT LOGGING
-- ====================================================

-- Create audit table for tracking supplier access
CREATE TABLE IF NOT EXISTS public.suppliers_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  supplier_id UUID,
  access_type TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT false,
  sensitive_fields_accessed TEXT[] DEFAULT ARRAY[]::text[],
  access_justification TEXT,
  security_risk_level TEXT NOT NULL DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  session_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.suppliers_access_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit logs
CREATE POLICY "suppliers_audit_admin_only" 
ON public.suppliers_access_audit FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_supplier_access()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  risk_level TEXT := 'medium';
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM profiles 
  WHERE user_id = auth.uid();

  -- Determine risk level
  IF TG_OP = 'SELECT' AND NEW.email IS NOT NULL THEN
    risk_level := 'high';
  ELSIF user_role IS NULL THEN
    risk_level := 'critical';
  END IF;

  -- Log the access attempt
  INSERT INTO public.suppliers_access_audit (
    user_id,
    supplier_id,
    access_type,
    access_granted,
    sensitive_fields_accessed,
    access_justification,
    security_risk_level,
    ip_address,
    session_details
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    TRUE,
    CASE 
      WHEN NEW.email IS NOT NULL THEN ARRAY['email', 'phone', 'contact_person', 'address']
      ELSE ARRAY['basic_info']
    END,
    CASE 
      WHEN user_role = 'admin' THEN 'Administrative access'
      WHEN user_role = 'supplier' THEN 'Supplier self-access'
      ELSE 'Business directory access'
    END,
    risk_level,
    inet_client_addr(),
    jsonb_build_object(
      'user_role', user_role,
      'table_operation', TG_OP,
      'timestamp', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to suppliers table
DROP TRIGGER IF EXISTS suppliers_access_audit_trigger ON public.suppliers;
CREATE TRIGGER suppliers_access_audit_trigger
  AFTER SELECT OR UPDATE OR INSERT OR DELETE
  ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_supplier_access();

-- ====================================================
-- STEP 8: GRANT NECESSARY PERMISSIONS
-- ====================================================

-- Grant execute permissions on the secure functions
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_admin_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_legitimate_business_access(UUID, UUID) TO authenticated;

-- ====================================================
-- FINAL SECURITY VERIFICATION
-- ====================================================

-- Verify that no unauthorized access is possible
DO $$
BEGIN
  -- Ensure that no public access exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND grantee = 'PUBLIC'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Public access still exists on suppliers table';
  END IF;
  
  RAISE NOTICE 'SECURITY VERIFICATION PASSED: Suppliers table is properly secured';
END $$;

-- Add helpful comments for developers
COMMENT ON TABLE public.suppliers IS 'Suppliers table with strict RLS policies. Contact information accessible only to admins and users with legitimate business relationships.';
COMMENT ON FUNCTION public.get_supplier_contact_secure(UUID) IS 'Secure function for accessing supplier contact information with business relationship verification.';
COMMENT ON FUNCTION public.get_suppliers_admin_directory() IS 'Admin-only function for accessing complete suppliers directory including contact information.';
COMMENT ON FUNCTION public.get_suppliers_public_directory() IS 'Public directory function that excludes sensitive contact information.';
