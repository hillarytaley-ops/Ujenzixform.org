
-- =====================================================
-- CRITICAL SECURITY FIX: Privilege Escalation Prevention
-- =====================================================
-- This migration fixes the security vulnerability where roles 
-- stored in profiles table could be modified by users
-- =====================================================

-- Step 1: Add strict RLS policy to prevent users from modifying their role field
CREATE POLICY "profiles_role_field_immutable" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  -- Allow update only if role field is not being changed
  -- OR if user is admin (via secure has_role check)
  (role = (SELECT role FROM profiles WHERE id = profiles.id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Step 2: Replace insecure functions with secure versions

-- Replace is_supplier_admin to use has_role
CREATE OR REPLACE FUNCTION public.is_supplier_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role);
$$;

-- Replace get_supplier_stats to use has_role
CREATE OR REPLACE FUNCTION public.get_supplier_stats()
RETURNS TABLE(total_suppliers bigint, verified_suppliers bigint, avg_rating numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use secure has_role function instead of checking profiles.role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;
  
  -- Return actual stats for admin users
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_suppliers,
    COUNT(CASE WHEN is_verified = true THEN 1 END)::bigint as verified_suppliers,
    COALESCE(AVG(rating), 0)::numeric as avg_rating
  FROM suppliers;
END;
$$;

-- Replace get_suppliers_directory_safe to use has_role
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE(id uuid, company_name text, contact_status text, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, specialties text[], materials_offered text[], rating numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use secure has_role function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;
  
  -- Return suppliers data for admin users only
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    'contact_protected'::text as contact_status,
    s.is_verified,
    s.created_at,
    s.updated_at,
    s.specialties,
    s.materials_offered,
    s.rating
  FROM suppliers s
  ORDER BY s.company_name;
END;
$$;

-- Replace get_suppliers_public_safe to use has_role
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use secure has_role function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO supplier_contact_security_audit (
      user_id, contact_field_requested, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 'directory_blocked', false,
      'Non-admin user blocked', 'high'
    );
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id, s.company_name, s.specialties, s.materials_offered,
    s.rating, s.is_verified, s.created_at, s.updated_at,
    'PROTECTED - Business verification required'::text as contact_status
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- Replace suppliers_security_audit_v2 trigger to use has_role
CREATE OR REPLACE FUNCTION public.suppliers_security_audit_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_uuid UUID;
  is_admin BOOLEAN;
BEGIN
  SELECT auth.uid() INTO user_uuid;
  -- Use secure has_role function
  SELECT has_role(user_uuid, 'admin'::app_role) INTO is_admin;
  
  -- Only log if audit table exists to prevent errors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers_access_audit') THEN
    INSERT INTO public.suppliers_access_audit (
      user_id, 
      supplier_id, 
      access_type,
      access_granted,
      sensitive_fields_accessed,
      access_justification,
      security_risk_level
    ) VALUES (
      user_uuid,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      is_admin,
      ARRAY['email', 'phone', 'contact_person', 'address'],
      CASE 
        WHEN is_admin THEN format('Admin %s operation', TG_OP)
        ELSE format('BLOCKED: %s attempt by non-admin', TG_OP)
      END,
      CASE 
        WHEN is_admin THEN 'low'
        ELSE 'critical'
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Add helper function to safely check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user_secure()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role);
$$;

-- Step 4: Add comment documenting the security model
COMMENT ON COLUMN public.profiles.role IS 
  'DISPLAY ONLY - Do not use for authorization! Use has_role() function with user_roles table instead. This field is for UI display purposes only.';

COMMENT ON TABLE public.user_roles IS 
  'SECURITY: This is the authoritative source for user roles. All authorization checks MUST use has_role() function which queries this table.';
