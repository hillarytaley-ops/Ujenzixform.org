-- Phase 1: Identify and fix tables with RLS but no policies
-- Query to find tables with RLS enabled but no policies

DO $$
DECLARE
    table_record RECORD;
    policy_count INTEGER;
BEGIN
    -- Log tables with RLS enabled but no policies
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        -- Count policies for this table
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = table_record.schemaname 
        AND tablename = table_record.tablename;
        
        IF policy_count = 0 THEN
            RAISE NOTICE 'Table %.% has RLS enabled but no policies', 
                table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- Add policies only for tables that definitely exist based on the schema
-- These are minimal default-deny policies for security

-- For tables that exist but we haven't verified column names:
-- We'll add admin-only access as the safest default

-- Check and add policies only if tables exist
DO $$
BEGIN
    -- supplier_business_relationships (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_business_relationships') THEN
        DROP POLICY IF EXISTS "supplier_relationships_admin_only" ON public.supplier_business_relationships;
        CREATE POLICY "supplier_relationships_admin_only" ON public.supplier_business_relationships
        FOR ALL TO authenticated
        USING (has_role(auth.uid(), 'admin'::app_role))
        WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
        
        RAISE NOTICE 'Added policies to supplier_business_relationships';
    END IF;

    -- supplier_business_verification (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_business_verification') THEN
        DROP POLICY IF EXISTS "supplier_verification_admin_only" ON public.supplier_business_verification;
        CREATE POLICY "supplier_verification_admin_only" ON public.supplier_business_verification
        FOR ALL TO authenticated
        USING (has_role(auth.uid(), 'admin'::app_role))
        WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
        
        RAISE NOTICE 'Added policies to supplier_business_verification';
    END IF;

    -- location_access_security_audit
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'location_access_security_audit') THEN
        DROP POLICY IF EXISTS "location_audit_insert" ON public.location_access_security_audit;
        DROP POLICY IF EXISTS "location_audit_admin_read" ON public.location_access_security_audit;
        
        CREATE POLICY "location_audit_insert" ON public.location_access_security_audit
        FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
        
        CREATE POLICY "location_audit_admin_read" ON public.location_access_security_audit
        FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
        
        RAISE NOTICE 'Added policies to location_access_security_audit';
    END IF;

    -- profile_access_security_audit
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_access_security_audit') THEN
        DROP POLICY IF EXISTS "profile_audit_insert" ON public.profile_access_security_audit;
        DROP POLICY IF EXISTS "profile_audit_admin_read" ON public.profile_access_security_audit;
        
        CREATE POLICY "profile_audit_insert" ON public.profile_access_security_audit
        FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
        
        CREATE POLICY "profile_audit_admin_read" ON public.profile_access_security_audit
        FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
        
        RAISE NOTICE 'Added policies to profile_access_security_audit';
    END IF;

    RAISE NOTICE 'Phase 1 migration complete - added policies to existing tables';
END $$;