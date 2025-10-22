-- Fix critical security vulnerability: Secure supplier contact information from unauthorized access

-- Drop ALL existing policies on suppliers table to ensure clean slate
DROP POLICY IF EXISTS "Suppliers: Admin full access" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers: Manage own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers: Authenticated basic view only" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update own data" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can create own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers are visible to authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Public supplier access" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;

-- Create secure restrictive policies for suppliers table
CREATE POLICY "Secure suppliers: Admin full access" 
ON public.suppliers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Secure suppliers: Own profile management" 
ON public.suppliers FOR ALL 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'supplier'
    AND id = suppliers.user_id
  )
);

CREATE POLICY "Secure suppliers: Basic info only for authenticated" 
ON public.suppliers FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- Enhanced secure supplier directory function (no contact info exposed)
CREATE OR REPLACE FUNCTION public.get_secure_suppliers_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_info_status text,
  business_verified boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  is_authenticated boolean := false;
BEGIN
  -- Check if user is authenticated
  SELECT auth.uid() IS NOT NULL INTO is_authenticated;
  
  -- Get current user profile if authenticated
  IF is_authenticated THEN
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
  END IF;
  
  -- Return secure supplier directory without exposing contact information
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN is_authenticated THEN 'Contact available to business partners'
      ELSE 'Sign up to view supplier information'
    END as contact_info_status,
    s.is_verified as business_verified
  FROM suppliers s
  WHERE s.is_verified = true -- Only show verified suppliers in directory
  ORDER BY s.rating DESC, s.company_name ASC;
END;
$$;

-- Enhanced secure supplier contact access function
CREATE OR REPLACE FUNCTION public.get_supplier_with_secure_contact(supplier_uuid uuid)
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
  can_view_contact boolean,
  contact_access_reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  can_access_contact boolean := false;
  supplier_record suppliers%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
  access_reason text := 'unauthorized';
BEGIN
  -- Get the supplier record
  SELECT * INTO supplier_record 
  FROM suppliers 
  WHERE suppliers.id = supplier_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Strict business relationship requirements for contact access
  IF user_profile_record.role = 'admin' THEN
    can_access_contact := true;
    access_reason := 'admin_access';
  ELSIF EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.buyer_id = user_profile_record.id 
    AND po.supplier_id = supplier_uuid
    AND po.created_at > now() - interval '1 year' -- Active business relationship
  ) THEN
    can_access_contact := true;
    access_reason := 'active_purchase_orders';
  ELSIF EXISTS (
    SELECT 1 FROM quotation_requests qr 
    WHERE qr.requester_id = user_profile_record.id 
    AND qr.supplier_id = supplier_uuid
    AND qr.created_at > now() - interval '6 months' -- Recent quotation requests
  ) THEN
    can_access_contact := true;
    access_reason := 'recent_quotation_requests';
  ELSIF EXISTS (
    SELECT 1 FROM delivery_requests dr 
    WHERE dr.builder_id = user_profile_record.id 
    AND EXISTS (
      SELECT 1 FROM deliveries d 
      WHERE d.supplier_id = supplier_uuid 
      AND d.builder_id = dr.builder_id
      AND d.created_at > now() - interval '6 months' -- Recent deliveries
    )
  ) THEN
    can_access_contact := true;
    access_reason := 'recent_delivery_relationship';
  ELSIF user_profile_record.role = 'supplier' AND supplier_record.user_id = user_profile_record.id THEN
    can_access_contact := true;
    access_reason := 'own_supplier_profile';
  END IF;
  
  -- Log contact access attempts for security monitoring
  IF can_access_contact THEN
    PERFORM public.log_supplier_contact_access(
      supplier_uuid, 
      'secure_contact_authorized_' || access_reason, 
      ARRAY['contact_person', 'email', 'phone', 'address']
    );
  ELSE
    PERFORM public.log_supplier_contact_access(
      supplier_uuid, 
      'secure_contact_denied_' || COALESCE(user_profile_record.role, 'unknown'), 
      ARRAY[]::text[]
    );
  END IF;
  
  -- Return data with conditional contact information
  RETURN QUERY SELECT
    supplier_record.id,
    supplier_record.company_name,
    CASE 
      WHEN can_access_contact THEN supplier_record.contact_person 
      ELSE 'Contact available to business partners' 
    END,
    CASE 
      WHEN can_access_contact THEN supplier_record.email 
      ELSE NULL 
    END,
    CASE 
      WHEN can_access_contact THEN supplier_record.phone 
      ELSE NULL 
    END,
    CASE 
      WHEN can_access_contact THEN supplier_record.address 
      ELSE 'Location available to business partners' 
    END,
    supplier_record.specialties,
    supplier_record.materials_offered,
    supplier_record.rating,
    supplier_record.is_verified,
    supplier_record.created_at,
    supplier_record.updated_at,
    can_access_contact,
    CASE
      WHEN can_access_contact THEN 'Authorized access based on business relationship'
      WHEN user_profile_record.role IS NULL THEN 'Authentication required for contact access'
      ELSE 'Contact access requires active business relationship (orders, quotes, or recent deliveries)'
    END;
END;
$$;

-- Create supplier contact access audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.supplier_contact_access_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  supplier_id uuid,
  access_type text NOT NULL,
  access_granted boolean NOT NULL DEFAULT false,
  business_justification text,
  accessed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the audit table
ALTER TABLE public.supplier_contact_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Secure supplier audit: Admin access only" 
ON public.supplier_contact_access_audit FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);