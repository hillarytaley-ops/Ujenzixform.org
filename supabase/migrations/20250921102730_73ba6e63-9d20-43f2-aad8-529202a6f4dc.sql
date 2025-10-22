-- FINAL SUPPLIERS SECURITY LOCKDOWN
-- Clean up and create ultra-secure policies

-- Drop all existing policies safely
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on suppliers table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers', policy_record.policyname);
    END LOOP;
    
    -- Drop existing policies on business relationships table if it exists
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'supplier_business_relationships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.supplier_business_relationships', policy_record.policyname);
    END LOOP;
END $$;

-- Drop and recreate business relationships table to ensure clean state
DROP TABLE IF EXISTS public.supplier_business_relationships CASCADE;

-- Create business relationship verification table with time-limited access
CREATE TABLE public.supplier_business_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('purchase_order', 'quotation', 'delivery')),
  verified_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  verification_evidence jsonb DEFAULT '{}'::jsonb,
  admin_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(requester_id, supplier_id, relationship_type)
);

-- Enable RLS on business relationships table
ALTER TABLE public.supplier_business_relationships ENABLE ROW LEVEL SECURITY;

-- Create ULTRA-STRICT admin-only policies for suppliers table
CREATE POLICY "suppliers_emergency_admin_only" ON public.suppliers
FOR ALL USING (
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

-- Create admin-only policy for business relationships
CREATE POLICY "business_relationships_emergency_admin_only" ON public.supplier_business_relationships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update secure supplier directory function - ADMIN ONLY
CREATE OR REPLACE FUNCTION public.get_suppliers_admin_only()
RETURNS TABLE(
  id uuid, 
  company_name text, 
  specialties text[], 
  materials_offered text[], 
  rating numeric, 
  is_verified boolean, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone,
  contact_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access suppliers directory
  IF current_user_role = 'admin' THEN
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
      'admin_full_access'::text as contact_status
    FROM suppliers s
    ORDER BY s.company_name;
  ELSE
    -- Non-admin users get no access
    RETURN;
  END IF;
END;
$$;

-- Create emergency contact protection function
CREATE OR REPLACE FUNCTION public.get_supplier_contact_emergency_protected(
  supplier_uuid uuid
) RETURNS TABLE(
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
  supplier_exists BOOLEAN;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check if supplier exists
  SELECT EXISTS(SELECT 1 FROM suppliers WHERE suppliers.id = supplier_uuid) INTO supplier_exists;
  
  IF NOT supplier_exists THEN
    RETURN;
  END IF;
  
  -- Log ALL access attempts
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'all_contact_fields', 
    (current_user_role = 'admin'),
    CASE WHEN current_user_role = 'admin' THEN 'Admin emergency access' ELSE 'Access denied - admin only' END,
    CASE WHEN current_user_role = 'admin' THEN 'low' ELSE 'critical' END
  );
  
  -- Only admin gets contact info
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      true as access_granted,
      'Admin emergency access granted'::text as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return protected response for non-admin
    RETURN QUERY
    SELECT 
      supplier_uuid,
      'Contact information protected'::text,
      'Admin access required'::text,
      'Admin access required'::text, 
      'Admin access required'::text,
      'Admin access required'::text,
      false as access_granted,
      'Contact information restricted to administrators only'::text as access_reason;
  END IF;
END;
$$;