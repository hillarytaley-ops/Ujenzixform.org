-- Fix supplier directory security - Phase 3: Clean slate approach

-- Drop ALL existing policies on suppliers table to start fresh
DROP POLICY IF EXISTS "suppliers_ultra_secure_admin_owner_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_directory_admin_only_access_ultra_secure" ON public.suppliers;
DROP POLICY IF EXISTS "admins_full_supplier_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_only_full_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_records_only" ON public.suppliers;

-- Create ONLY ultra-secure policies
-- 1. Admin-only full access policy
CREATE POLICY "suppliers_admin_only_2024_secure" ON public.suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. Supplier owner can only see/edit their own record
CREATE POLICY "suppliers_owner_only_2024_secure" ON public.suppliers
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create business relationship verification table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_relationship_verifications') THEN
        CREATE TABLE public.business_relationship_verifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          requester_id uuid NOT NULL,
          supplier_id uuid NOT NULL,
          relationship_type text NOT NULL,
          verification_evidence jsonb DEFAULT '{}',
          verified_by uuid,
          expires_at timestamp with time zone NOT NULL,
          is_active boolean DEFAULT true,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now(),
          UNIQUE(requester_id, supplier_id, relationship_type)
        );
        
        -- Enable RLS
        ALTER TABLE public.business_relationship_verifications ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can manage business relationship verifications
        CREATE POLICY "business_verifications_admin_only_2024" ON public.business_relationship_verifications
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
END $$;

-- Update existing function to use business verification
DROP FUNCTION IF EXISTS public.get_supplier_secure_with_contact_verification(uuid);

CREATE OR REPLACE FUNCTION public.get_supplier_secure_with_contact_verification(
  supplier_uuid uuid
) RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[], 
  rating numeric, is_verified boolean, created_at timestamp with time zone, 
  updated_at timestamp with time zone, contact_person text, email text, 
  phone text, address text, access_granted boolean, access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_profile_id uuid;
  has_purchase_order boolean := false;
  access_granted_val boolean := false;
  access_reason_val text := 'No business relationship verified';
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin users get automatic access
  IF current_user_role = 'admin' THEN
    access_granted_val := true;
    access_reason_val := 'Admin access granted';
  ELSE
    -- Check for recent purchase orders (business relationship verification)
    SELECT EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.buyer_id = current_user_profile_id
        AND po.supplier_id = supplier_uuid
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > (now() - INTERVAL '30 days')
    ) INTO has_purchase_order;
    
    IF has_purchase_order THEN
      access_granted_val := true;
      access_reason_val := 'Verified business relationship - recent purchase order';
    END IF;
  END IF;
  
  -- Log access attempt for security audit
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, 
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'contact_info_request',
    access_granted_val, access_granted_val,
    access_reason_val,
    CASE WHEN access_granted_val THEN 'low' ELSE 'high' END
  );
  
  -- Return data based on access level
  IF access_granted_val THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      s.contact_person, s.email, s.phone, s.address,
      true as access_granted, access_reason_val as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return basic info only, no contact details
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      'Contact verification required'::text as contact_person,
      'Business relationship required'::text as email,
      'Business relationship required'::text as phone,
      'Business relationship required'::text as address,
      false as access_granted, access_reason_val as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid AND s.is_verified = true;
  END IF;
END;
$$;

-- Replace public directory function with admin-only version
CREATE OR REPLACE FUNCTION public.get_suppliers_safe_directory()
RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[], 
  rating numeric, is_verified boolean, created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Log directory access attempt
  INSERT INTO suppliers_access_audit (
    user_id, access_type, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'directory_access_attempt', 
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin directory access granted'
      ELSE 'BLOCKED: Non-admin directory access attempt'
    END,
    CASE WHEN current_user_role = 'admin' THEN 'low' ELSE 'critical' END
  );
  
  -- Only admins can access suppliers directory
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  END IF;
  -- Non-admins get no data (empty result set)
END;
$$;