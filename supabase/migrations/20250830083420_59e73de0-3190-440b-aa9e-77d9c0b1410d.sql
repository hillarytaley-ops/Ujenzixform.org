-- Fix remaining security issues and finalize secure supplier access

-- Fix function search path issue
CREATE OR REPLACE FUNCTION public.get_public_supplier_info(supplier_row suppliers)
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    supplier_row.id,
    supplier_row.company_name,
    supplier_row.specialties,
    supplier_row.materials_offered,
    supplier_row.rating,
    supplier_row.is_verified,
    supplier_row.created_at,
    supplier_row.updated_at;
$$;

-- Remove the problematic view completely and use functions instead
DROP VIEW IF EXISTS public.suppliers_directory;

-- Create a secure function to get supplier directory for public access
CREATE OR REPLACE FUNCTION public.get_suppliers_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_info_status text
) 
LANGUAGE sql
STABLE
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
    s.created_at,
    s.updated_at,
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 'Contact available to registered users'
      ELSE 'Sign up to view contact information'
    END as contact_info_status
  FROM suppliers s
  WHERE s.is_verified = true; -- Only show verified suppliers in public directory
$$;

-- Create secure function for authenticated users to get contact info
CREATE OR REPLACE FUNCTION public.get_supplier_with_contact(supplier_id uuid)
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
  can_view_contact boolean
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_access_contact boolean := false;
  supplier_record suppliers%ROWTYPE;
BEGIN
  -- Get the supplier record
  SELECT * INTO supplier_record 
  FROM suppliers 
  WHERE suppliers.id = supplier_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if user can access contact information
  SELECT public.can_access_supplier_contact(supplier_id) INTO can_access_contact;
  
  -- Log contact access if sensitive fields are being viewed
  IF can_access_contact THEN
    PERFORM public.log_supplier_contact_access(
      supplier_id, 
      'contact_view', 
      ARRAY['contact_person', 'email', 'phone', 'address']
    );
  END IF;
  
  -- Return data with conditional contact information
  RETURN QUERY SELECT
    supplier_record.id,
    supplier_record.company_name,
    CASE WHEN can_access_contact THEN supplier_record.contact_person ELSE 'Contact available to business partners' END,
    CASE WHEN can_access_contact THEN supplier_record.email ELSE NULL END,
    CASE WHEN can_access_contact THEN supplier_record.phone ELSE NULL END,
    CASE WHEN can_access_contact THEN supplier_record.address ELSE 'Location available to business partners' END,
    supplier_record.specialties,
    supplier_record.materials_offered,
    supplier_record.rating,
    supplier_record.is_verified,
    supplier_record.created_at,
    supplier_record.updated_at,
    can_access_contact;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_suppliers_directory() TO public;
GRANT EXECUTE ON FUNCTION public.get_supplier_with_contact(uuid) TO authenticated;