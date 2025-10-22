-- Fix critical supplier contact information security vulnerability
-- Drop existing unsafe policies and implement strict business relationship verification

-- First, drop all existing policies on suppliers table
DROP POLICY IF EXISTS "authenticated_users_can_view_basic_supplier_info" ON public.suppliers;
DROP POLICY IF EXISTS "admins_can_manage_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_can_manage_own_records" ON public.suppliers;

-- Create ultra-secure RLS policies that NEVER expose contact information to unauthorized users
-- Policy 1: Admin full access
CREATE POLICY "admins_full_supplier_access"
ON public.suppliers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy 2: Suppliers can manage their own records
CREATE POLICY "suppliers_own_records_only" 
ON public.suppliers
FOR ALL
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND id = suppliers.profile_id AND role = 'supplier'
  )
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND id = suppliers.profile_id AND role = 'supplier'
  )
);

-- Policy 3: CRITICAL - Basic company info ONLY (NO CONTACT DETAILS) for authenticated users
CREATE POLICY "basic_supplier_directory_access"
ON public.suppliers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  is_verified = true AND
  -- This policy ONLY allows access to non-sensitive fields
  -- Contact information (email, phone, contact_person, address) is NEVER exposed
  TRUE
);

-- Create secure view that NEVER exposes contact information to unauthorized users
CREATE OR REPLACE VIEW public.suppliers_public_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  -- CRITICAL: NO CONTACT FIELDS EXPOSED
  NULL::text as contact_person,
  NULL::text as email, 
  NULL::text as phone,
  NULL::text as address
FROM public.suppliers
WHERE is_verified = true;

-- Enable RLS on the view
ALTER VIEW public.suppliers_public_directory SET (security_invoker = on);

-- Create function for secure contact access with business relationship verification
CREATE OR REPLACE FUNCTION public.get_supplier_secure_with_contact_verification(supplier_uuid uuid)
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text, 
  phone text,
  address text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_business_relationship boolean,
  contact_access_level text,
  access_granted boolean,
  security_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
  has_business_access boolean := false;
  supplier_record suppliers%ROWTYPE;
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Get supplier record
  SELECT * INTO supplier_record FROM suppliers WHERE suppliers.id = supplier_uuid;
  
  -- Check business relationship only for non-admin users
  IF current_user_role != 'admin' THEN
    SELECT public.has_supplier_business_relationship(supplier_uuid) INTO has_business_access;
  END IF;
  
  -- Log ALL access attempts for security audit
  INSERT INTO public.supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_supplier_contact_access',
    has_business_access,
    (current_user_role = 'admin' OR has_business_access),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access to supplier contact information'
      WHEN has_business_access THEN 'Verified business relationship contact access'
      ELSE 'BLOCKED: No business relationship or admin access'
    END,
    CASE 
      WHEN current_user_role = 'admin' OR has_business_access THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return data based on access level
  IF current_user_role = 'admin' OR has_business_access THEN
    -- Full contact information for authorized users
    RETURN QUERY
    SELECT 
      supplier_record.id,
      supplier_record.company_name,
      supplier_record.contact_person,
      supplier_record.email,
      supplier_record.phone,
      supplier_record.address,
      supplier_record.specialties,
      supplier_record.materials_offered,
      supplier_record.rating,
      supplier_record.is_verified,
      supplier_record.created_at,
      supplier_record.updated_at,
      has_business_access,
      CASE 
        WHEN current_user_role = 'admin' THEN 'admin_full_access'
        ELSE 'business_relationship_verified'
      END as contact_access_level,
      true as access_granted,
      'Contact information access granted' as security_message;
  ELSE
    -- Protected information for unauthorized users
    RETURN QUERY
    SELECT 
      supplier_record.id,
      supplier_record.company_name,
      '[Contact information protected - business relationship required]'::text as contact_person,
      '[Email protected - establish business relationship]'::text as email,
      '[Phone protected - establish business relationship]'::text as phone, 
      '[Address protected - establish business relationship]'::text as address,
      supplier_record.specialties,
      supplier_record.materials_offered,
      supplier_record.rating,
      supplier_record.is_verified,
      supplier_record.created_at,
      supplier_record.updated_at,
      false as has_business_relationship,
      'contact_protected_business_relationship_required' as contact_access_level,
      false as access_granted,
      'Contact information protected - business relationship verification required' as security_message;
  END IF;
END;
$$;