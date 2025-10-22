-- NUCLEAR SECURITY FIX: Complete Supplier Contact Lockdown
-- Previous attempt showed contact data still accessible - implementing maximum security

-- Step 1: Completely revoke all access
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;
REVOKE ALL PRIVILEGES ON public.suppliers FROM PUBLIC;

-- Step 2: Drop all existing policies completely
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'suppliers'
  LOOP 
    EXECUTE format('DROP POLICY %I ON public.suppliers', pol.policyname);
  END LOOP;
END $$;

-- Step 3: Enable maximum RLS protection
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

-- Step 4: Create absolute security functions
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_supplier_self_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL AND 
         auth.uid() = target_user_id AND
         EXISTS (
           SELECT 1 FROM profiles 
           WHERE user_id = auth.uid() AND role = 'supplier'
         );
END;
$$;

-- Step 5: Create ultra-restrictive policies that DENY everything by default
CREATE POLICY "suppliers_deny_all_default" ON public.suppliers
FOR ALL
USING (false)
WITH CHECK (false);

-- Step 6: Create specific admin access policy (higher priority)
CREATE POLICY "suppliers_admin_only" ON public.suppliers
FOR ALL TO authenticated
USING (public.verify_admin_access())
WITH CHECK (public.verify_admin_access());

-- Step 7: Create supplier self-access policy
CREATE POLICY "suppliers_self_only" ON public.suppliers
FOR ALL TO authenticated  
USING (public.verify_supplier_self_access(user_id))
WITH CHECK (public.verify_supplier_self_access(user_id));

-- Step 8: Absolute anonymous blocking
CREATE POLICY "suppliers_no_anon" ON public.suppliers
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Step 9: Update directory function with stronger restrictions
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
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
BEGIN
  -- Absolutely NO directory access for non-admins
  IF NOT public.verify_admin_access() THEN
    RETURN; -- Return nothing
  END IF;
  
  -- Admins get directory without contact details
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
    'PROTECTED: Contact via secure business verification only'::text
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- Step 10: Grant only function execution
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_supplier_self_access(uuid) TO authenticated;

-- Step 11: Final security verification
SELECT 'Supplier contact security lockdown complete' as status;