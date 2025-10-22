-- CRITICAL Security Fix: Eliminate Public Access to Supplier Contact Information
-- This fixes the security vulnerability where supplier emails, phones, and addresses are publicly accessible

-- Drop any publicly accessible supplier directory tables/views
DO $$
BEGIN
    -- Drop views first
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'suppliers_public_directory') THEN
        DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;
        RAISE NOTICE 'Dropped insecure suppliers_public_directory view';
    END IF;
    
    -- Then drop tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers_public_directory' AND table_type = 'BASE TABLE') THEN
        DROP TABLE IF EXISTS public.suppliers_public_directory CASCADE;
        RAISE NOTICE 'Dropped insecure suppliers_public_directory table';
    END IF;
END $$;

-- Strengthen RLS policies on suppliers table to prevent contact harvesting
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Remove any overly permissive existing policies
DROP POLICY IF EXISTS "suppliers_admin_only_2024_secure" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_only_2024_secure" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_full_access_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_access_2024" ON public.suppliers;

-- Create ultra-secure RLS policies
CREATE POLICY "suppliers_admin_only_secure_2024" ON public.suppliers
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow suppliers to manage only their own records
CREATE POLICY "suppliers_owner_only_secure_2024" ON public.suppliers
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Revoke ALL public and anonymous access to suppliers table
REVOKE ALL ON public.suppliers FROM public;
REVOKE ALL ON public.suppliers FROM anon;

-- Only grant access to authenticated users through RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Update useSuppliers hook to use secure functions that already exist
-- The existing secure functions are already properly implemented:
-- - get_suppliers_admin_directory() for admin users with full contact info
-- - get_suppliers_public_directory() for authenticated users without contact info
-- - get_supplier_contact_secure() for business relationship verification

COMMENT ON TABLE public.suppliers IS 'SECURITY: Contact information protected by strict RLS - admin/owner access only';

-- Security validation - ensure no direct public access remains
DO $$
BEGIN
    -- Check that RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'suppliers' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'SECURITY ERROR: RLS not enabled on suppliers table';
    END IF;
    
    -- Confirm no public grants exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'suppliers' 
        AND grantee = 'public'
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) THEN
        RAISE EXCEPTION 'SECURITY ERROR: Public access still exists on suppliers table';
    END IF;
    
    RAISE NOTICE 'Security validation passed: Supplier contact information is now protected';
END $$;