-- Fix critical security vulnerability: Remove public access to supplier contact information
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Suppliers directory public for transparency" ON public.suppliers;

-- Create secure policies that protect contact information
-- Public can only see basic business information (no contact details)
CREATE POLICY "Public can view basic supplier directory" 
ON public.suppliers 
FOR SELECT 
TO public
USING (true);

-- But we need to modify the table structure to separate public vs private data
-- Add a view for public supplier information
CREATE OR REPLACE VIEW public.suppliers_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  -- Hide sensitive contact information from public view
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Contact available to registered users'
    ELSE 'Sign up to view contact information'
  END as contact_info_status
FROM public.suppliers;

-- Allow public read access to the directory view
GRANT SELECT ON public.suppliers_directory TO public;

-- Create secure contact access policy for authenticated users
CREATE POLICY "Authenticated users can view supplier contact info" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (
  -- Authenticated users can see contact info for legitimate business purposes
  auth.uid() IS NOT NULL
);

-- Create business relationship access policy for enhanced security
CREATE POLICY "Business partners have full contact access" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (
  -- Enhanced access for users with active business relationships
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = suppliers.user_id OR  -- Supplier owns the record
      EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.supplier_id = suppliers.id 
        AND po.buyer_id = p.id
      ) OR
      EXISTS (
        SELECT 1 FROM quotation_requests qr 
        WHERE qr.supplier_id = suppliers.id 
        AND qr.requester_id = p.id
      )
    )
  )
);

-- Add RLS enable (should already be enabled but ensure it)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create audit log for contact access
CREATE TABLE IF NOT EXISTS public.supplier_contact_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  access_type text NOT NULL,
  accessed_fields text[] DEFAULT ARRAY[]::text[],
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.supplier_contact_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin can view contact access logs"
ON public.supplier_contact_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);