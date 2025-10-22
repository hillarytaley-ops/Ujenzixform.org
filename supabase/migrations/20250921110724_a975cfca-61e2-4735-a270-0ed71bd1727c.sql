-- Revert suppliers table to admin-only access with stricter RLS policies
-- Drop the current policies
DROP POLICY IF EXISTS "suppliers_admin_full_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_basic_info_authenticated" ON public.suppliers;

-- Create ultra-strict admin-only policy for suppliers table
CREATE POLICY "suppliers_ultra_secure_admin_only" 
ON public.suppliers 
FOR ALL 
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

-- Update get_suppliers_basic_info function to be admin-only
CREATE OR REPLACE FUNCTION public.get_suppliers_basic_info()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      -- Contact availability flag (no actual contact details exposed)
      CASE 
        WHEN s.contact_person IS NOT NULL OR s.email IS NOT NULL OR s.phone IS NOT NULL 
        THEN true 
        ELSE false 
      END as contact_available
    FROM suppliers s
    ORDER BY s.company_name;
  ELSE
    -- Non-admin users get no access
    RETURN;
  END IF;
END;
$$;

-- Create business verification table for time-limited access
CREATE TABLE IF NOT EXISTS public.supplier_business_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  verification_type text NOT NULL,
  verification_evidence jsonb DEFAULT '{}',
  granted_by uuid REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL,
  access_level text NOT NULL DEFAULT 'basic',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, supplier_id, verification_type)
);

-- Enable RLS on business verification table
ALTER TABLE public.supplier_business_verification ENABLE ROW LEVEL SECURITY;

-- Create policy for business verification access
CREATE POLICY "business_verification_admin_only" 
ON public.supplier_business_verification 
FOR ALL 
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

-- Create function for ultra-secure business verification
CREATE OR REPLACE FUNCTION public.verify_business_relationship_strict(
  target_supplier_id uuid,
  verification_evidence jsonb DEFAULT '{}',
  requested_access_level text DEFAULT 'basic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
  verification_result jsonb;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can grant business verification
  IF current_user_role = 'admin' THEN
    -- Create time-limited verification (24 hours)
    INSERT INTO supplier_business_verification (
      user_id, supplier_id, verification_type, verification_evidence,
      granted_by, expires_at, access_level
    ) VALUES (
      auth.uid(), target_supplier_id, 'admin_verified',
      verification_evidence, auth.uid(),
      now() + INTERVAL '24 hours', requested_access_level
    ) ON CONFLICT (user_id, supplier_id, verification_type)
    DO UPDATE SET
      expires_at = now() + INTERVAL '24 hours',
      verification_evidence = EXCLUDED.verification_evidence,
      access_level = EXCLUDED.access_level,
      updated_at = now(),
      is_active = true;
    
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_verified',
      'expires_at', (now() + INTERVAL '24 hours'),
      'verification_method', 'admin_approval'
    );
  ELSE
    -- Non-admin users cannot access business verification
    RETURN jsonb_build_object(
      'access_granted', false,
      'access_level', 'none',
      'reason', 'Business verification restricted to administrators only',
      'requirements', 'Admin approval required for supplier contact access'
    );
  END IF;
END;
$$;