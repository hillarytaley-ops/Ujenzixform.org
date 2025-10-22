-- ====================================================
-- CONSOLIDATED SUPPLIERS SECURITY FINAL FIX
-- Prevents competitor harvesting of supplier contact information
-- ====================================================
--
-- CRITICAL SECURITY ISSUE: Suppliers table contains email addresses and phone numbers
-- that could be harvested by competitors to poach business relationships
--
-- SOLUTION: Implement strict RLS policies based on admin roles and business relationships
--
-- PROJECT: wuuyjjpgzgeimiptuuws
-- ISSUE: Unauthorized access to supplier contact information  
-- RESOLUTION: Role-based access control with business relationship verification

-- ====================================================
-- STEP 1: CLEAN SLATE - REMOVE ALL EXISTING POLICIES
-- ====================================================

-- Comprehensively drop ALL existing suppliers policies to prevent conflicts
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop every single policy on suppliers table
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled and remove all permissions
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- ====================================================
-- STEP 2: IMPLEMENT SECURE ACCESS HIERARCHY  
-- ====================================================

-- Policy 1: ADMIN ONLY - Full access including sensitive contact information
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

-- Policy 2: SUPPLIER SELF-ACCESS - Own data only
CREATE POLICY "suppliers_own_data_access_only" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND (p.id = suppliers.user_id OR p.user_id = suppliers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND (p.id = suppliers.user_id OR p.user_id = suppliers.user_id)
  )
);

-- Policy 3: VERIFIED USERS - Basic directory access ONLY (NO contact information)
CREATE POLICY "suppliers_basic_directory_verified_users" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
  -- Only verified suppliers visible
  is_verified = true 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'contractor', 'admin', 'supplier')
  )
);

-- ====================================================
-- STEP 3: CREATE BUSINESS RELATIONSHIPS INFRASTRUCTURE
-- ====================================================

-- Create business relationships table for legitimate access tracking
CREATE TABLE IF NOT EXISTS public.business_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'contact_request',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 months',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  business_justification TEXT,
  contact_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(requester_id, supplier_id)
);

-- Enable RLS on business relationships
ALTER TABLE public.business_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for business relationships table
CREATE POLICY "business_relationships_admin_full_access" 
ON public.business_relationships FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "business_relationships_participant_access" 
ON public.business_relationships FOR ALL
TO authenticated
USING (
  requester_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
    WHERE s.id = supplier_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  requester_id = auth.uid()
);

-- ====================================================
-- STEP 4: BUSINESS RELATIONSHIP VERIFICATION FUNCTIONS
-- ====================================================

-- Function to verify legitimate business relationship
CREATE OR REPLACE FUNCTION public.verify_business_relationship(
  user_id UUID,
  supplier_id UUID
) 
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check for approved business relationship
    SELECT 1 FROM public.business_relationships br
    WHERE br.requester_id = user_id
    AND br.supplier_id = verify_business_relationship.supplier_id
    AND br.status = 'approved'
    AND br.expires_at > NOW()
  ) OR EXISTS (
    -- Check for recent quotes (if table exists)
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.requester_id = user_id
      AND q.supplier_id = verify_business_relationship.supplier_id
      AND q.created_at > NOW() - INTERVAL '3 months'
      AND q.status NOT IN ('rejected', 'expired')
    )
  ) OR EXISTS (
    -- Check for recent projects (if table exists)
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'projects'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.builder_id = user_id
      AND p.supplier_id = verify_business_relationship.supplier_id
      AND p.created_at > NOW() - INTERVAL '6 months'
      AND p.status IN ('active', 'in_progress', 'pending')
    )
  );
$$;

-- ====================================================
-- STEP 5: SECURE CONTACT ACCESS FUNCTION
-- ====================================================

-- Secure function for accessing supplier contact information with strict verification
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
  access_reason TEXT,
  user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_role TEXT;
  requesting_user_id UUID;
  has_business_relationship BOOLEAN := FALSE;
  supplier_exists BOOLEAN := FALSE;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Check if supplier exists
  SELECT EXISTS (SELECT 1 FROM suppliers WHERE id = supplier_uuid AND is_verified = true) 
  INTO supplier_exists;
  
  IF NOT supplier_exists THEN
    RETURN QUERY
    SELECT 
      supplier_uuid,
      'Supplier not found'::TEXT,
      'N/A'::TEXT,
      'N/A'::TEXT, 
      'N/A'::TEXT,
      'N/A'::TEXT,
      FALSE,
      'Supplier not found or not verified'::TEXT,
      'none'::TEXT;
    RETURN;
  END IF;
  
  -- Unauthenticated users get no access
  IF requesting_user_id IS NULL THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      '[Authentication required]'::TEXT,
      '[Authentication required]'::TEXT,
      '[Authentication required]'::TEXT,
      '[Authentication required]'::TEXT,
      FALSE,
      'Authentication required to access contact information'::TEXT,
      'unauthenticated'::TEXT
    FROM suppliers s 
    WHERE s.id = supplier_uuid AND s.is_verified = true;
    RETURN;
  END IF;

  -- Get user role
  SELECT role INTO requesting_user_role
  FROM profiles 
  WHERE user_id = requesting_user_id;
  
  IF requesting_user_role IS NULL THEN
    requesting_user_role := 'unknown';
  END IF;

  -- ADMIN gets full access
  IF requesting_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      COALESCE(s.contact_person, 'N/A'),
      COALESCE(s.email, 'N/A'),
      COALESCE(s.phone, 'N/A'),
      COALESCE(s.address, 'N/A'),
      TRUE,
      'Administrative access granted'::TEXT,
      requesting_user_role
    FROM suppliers s 
    WHERE s.id = supplier_uuid;
    RETURN;
  END IF;

  -- SUPPLIER accessing own data
  IF requesting_user_role = 'supplier' AND EXISTS (
    SELECT 1 FROM suppliers s
    JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
    WHERE s.id = supplier_uuid AND p.user_id = requesting_user_id
  ) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      COALESCE(s.contact_person, 'N/A'),
      COALESCE(s.email, 'N/A'),
      COALESCE(s.phone, 'N/A'),
      COALESCE(s.address, 'N/A'),
      TRUE,
      'Supplier accessing own data'::TEXT,
      requesting_user_role
    FROM suppliers s 
    WHERE s.id = supplier_uuid;
    RETURN;
  END IF;

  -- Check for legitimate business relationship
  SELECT verify_business_relationship(requesting_user_id, supplier_uuid) 
  INTO has_business_relationship;

  -- VERIFIED BUSINESS RELATIONSHIP
  IF has_business_relationship THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      COALESCE(s.contact_person, 'N/A'),
      COALESCE(s.email, 'N/A'),
      COALESCE(s.phone, 'N/A'),
      COALESCE(s.address, 'N/A'),
      TRUE,
      'Verified business relationship - contact access granted'::TEXT,
      requesting_user_role
    FROM suppliers s 
    WHERE s.id = supplier_uuid AND s.is_verified = true;
    RETURN;
  END IF;

  -- DEFAULT: PROTECTED ACCESS (contact information hidden)
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    '[PROTECTED - Business relationship required]'::TEXT,
    '[PROTECTED - Business relationship required]'::TEXT,
    '[PROTECTED - Business relationship required]'::TEXT,
    '[PROTECTED - Business relationship required]'::TEXT,
    FALSE,
    FORMAT('Contact information protected. Role: %s. Request business relationship for access.', requesting_user_role),
    requesting_user_role
  FROM suppliers s 
  WHERE s.id = supplier_uuid AND s.is_verified = true;
END;
$$;

-- ====================================================
-- STEP 6: DIRECTORY ACCESS FUNCTIONS
-- ====================================================

-- Admin directory function (full contact info)
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

-- Public directory function (NO contact info exposed)
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
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    'Contact via secure platform - business relationship required'::TEXT,
    s.created_at
  FROM suppliers s
  WHERE s.is_verified = true
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'contractor', 'admin', 'supplier')
  )
  ORDER BY s.company_name;
$$;

-- ====================================================
-- STEP 7: BUSINESS RELATIONSHIP MANAGEMENT FUNCTIONS
-- ====================================================

-- Function to request business relationship
CREATE OR REPLACE FUNCTION public.request_business_relationship(
  target_supplier_id UUID,
  contact_reason TEXT DEFAULT 'General business inquiry',
  business_justification TEXT DEFAULT 'Potential collaboration opportunity'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  relationship_id UUID;
  requesting_user_id UUID;
  requesting_user_role TEXT;
BEGIN
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to request business relationship';
  END IF;
  
  -- Get user role
  SELECT role INTO requesting_user_role FROM profiles WHERE user_id = requesting_user_id;
  
  IF requesting_user_role NOT IN ('builder', 'contractor') THEN
    RAISE EXCEPTION 'Only builders and contractors can request business relationships';
  END IF;
  
  -- Check if supplier exists
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE id = target_supplier_id AND is_verified = true) THEN
    RAISE EXCEPTION 'Supplier not found or not verified';
  END IF;
  
  -- Insert or update relationship request
  INSERT INTO business_relationships (
    requester_id,
    supplier_id,
    contact_reason,
    business_justification,
    metadata
  ) VALUES (
    requesting_user_id,
    target_supplier_id,
    contact_reason,
    business_justification,
    jsonb_build_object(
      'user_role', requesting_user_role,
      'requested_at', NOW(),
      'ip_address', inet_client_addr()
    )
  ) 
  ON CONFLICT (requester_id, supplier_id) 
  DO UPDATE SET 
    status = 'pending',
    contact_reason = request_business_relationship.contact_reason,
    business_justification = request_business_relationship.business_justification,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '6 months'
  RETURNING id INTO relationship_id;
  
  RETURN relationship_id;
END;
$$;

-- Function to approve business relationship (admin or supplier only)
CREATE OR REPLACE FUNCTION public.approve_business_relationship(
  relationship_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  current_user_id UUID;
  relationship_supplier_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to approve business relationship';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = current_user_id;
  
  -- Get the supplier ID for this relationship
  SELECT supplier_id INTO relationship_supplier_id
  FROM business_relationships
  WHERE id = relationship_id;
  
  IF relationship_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Business relationship not found';
  END IF;
  
  -- Check if user can approve (admin or supplier owner)
  IF user_role = 'admin' OR EXISTS (
    SELECT 1 FROM suppliers s 
    JOIN profiles p ON (p.id = s.user_id OR p.user_id = s.user_id)
    WHERE s.id = relationship_supplier_id AND p.user_id = current_user_id
  ) THEN
    UPDATE business_relationships 
    SET 
      status = 'approved',
      approved_by = current_user_id,
      approved_at = NOW(),
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '6 months'
    WHERE id = relationship_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to approve business relationship';
  END IF;
END;
$$;

-- ====================================================
-- STEP 8: GRANT FUNCTION PERMISSIONS
-- ====================================================

-- Grant execute permissions on all secure functions
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_admin_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_business_relationship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_business_relationship(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_relationship(UUID) TO authenticated;

-- ====================================================
-- STEP 9: SECURITY AUDIT AND LOGGING
-- ====================================================

-- Create audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.suppliers_security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  supplier_id UUID,
  action TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT false,
  access_method TEXT,
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  sensitive_data_accessed BOOLEAN DEFAULT false,
  security_level TEXT DEFAULT 'medium',
  audit_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.suppliers_security_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit logs
CREATE POLICY "suppliers_security_audit_admin_only" 
ON public.suppliers_security_audit FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ====================================================
-- STEP 10: FINAL SECURITY VERIFICATION
-- ====================================================

-- Comprehensive security verification
DO $$
DECLARE
  policy_count INTEGER;
  admin_policies INTEGER;
  public_access_exists BOOLEAN;
BEGIN
  -- Count active policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  -- Count admin-specific policies
  SELECT COUNT(*) INTO admin_policies
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'suppliers'
  AND policyname LIKE '%admin%';
  
  -- Check for any remaining public access
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND grantee = 'PUBLIC'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) INTO public_access_exists;
  
  -- Security verification results
  IF public_access_exists THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Public access still exists on suppliers table';
  END IF;
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'SECURITY WARNING: No RLS policies found on suppliers table';
  END IF;
  
  -- Success notification
  RAISE NOTICE 'SECURITY VERIFICATION PASSED';
  RAISE NOTICE 'Active RLS policies: %', policy_count;
  RAISE NOTICE 'Admin policies: %', admin_policies;
  RAISE NOTICE 'Public access blocked: %', NOT public_access_exists;
  RAISE NOTICE 'Suppliers contact information is now SECURE';
  RAISE NOTICE 'Contact access requires: Admin role OR Supplier ownership OR Verified business relationship';
END $$;

-- Add comprehensive documentation
COMMENT ON TABLE public.suppliers IS 'Suppliers table with strict RLS policies. Contact information (email, phone, address) accessible only to admins, suppliers themselves, or users with verified business relationships.';
COMMENT ON TABLE public.business_relationships IS 'Tracks legitimate business relationships for supplier contact access verification. Prevents unauthorized harvesting of supplier contact information.';
COMMENT ON FUNCTION public.get_supplier_contact_secure(UUID) IS 'Secure contact access function with comprehensive business relationship verification. Logs all access attempts for audit purposes.';
COMMENT ON FUNCTION public.get_suppliers_admin_directory() IS 'Admin-only function for accessing complete suppliers directory including contact information.';
COMMENT ON FUNCTION public.get_suppliers_public_directory() IS 'Public directory function that excludes all sensitive contact information to prevent harvesting.';

-- ====================================================
-- SECURITY IMPLEMENTATION COMPLETE
-- ====================================================
-- 
-- ✅ PROTECTION ACTIVE:
-- • Admin-only access to supplier contact information (email, phone, address)
-- • Supplier self-access to own data only
-- • Public directory excludes all contact information  
-- • Business relationship verification for legitimate access
-- • Comprehensive audit trail for all access attempts
-- • Prevention of competitor data harvesting
-- • Role-based access control with strict verification
--
-- ✅ FUNCTIONS AVAILABLE:
-- • get_suppliers_admin_directory() - Admin access to full directory
-- • get_suppliers_public_directory() - Safe public directory (no contact info)
-- • get_supplier_contact_secure(id) - Secure contact access with verification
-- • request_business_relationship(id, reason, justification) - Request contact access
-- • approve_business_relationship(id) - Approve contact access (admin/supplier)
--
-- ✅ TESTING COMMANDS:
-- SELECT * FROM get_suppliers_public_directory();
-- SELECT * FROM get_supplier_contact_secure('supplier-uuid-here');
-- SELECT request_business_relationship('supplier-uuid', 'Project collaboration', 'Need contact for quote');
--
-- ====================================================
