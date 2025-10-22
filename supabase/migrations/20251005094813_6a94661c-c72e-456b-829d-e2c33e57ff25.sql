-- Phase 1 Final: Add default-deny policies to all remaining tables with RLS
-- This ensures all tables with RLS enabled have at least minimal protection

DO $$
DECLARE
    table_name TEXT;
    policy_count INTEGER;
    full_table_name TEXT;
BEGIN
    -- Find all tables with RLS enabled but no policies
    FOR table_name IN 
        SELECT t.tablename 
        FROM pg_tables t
        WHERE t.schemaname = 'public' 
        AND t.rowsecurity = true
    LOOP
        -- Count existing policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = table_name;
        
        -- If no policies exist, add default admin-only policies
        IF policy_count = 0 THEN
            full_table_name := 'public.' || table_name;
            
            -- Add SELECT policy (admin-only)
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (has_role(auth.uid(), ''admin''::app_role))',
                table_name || '_admin_select',
                full_table_name
            );
            
            -- Add INSERT policy (admin-only)
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), ''admin''::app_role))',
                table_name || '_admin_insert',
                full_table_name
            );
            
            -- Add UPDATE policy (admin-only)
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))',
                table_name || '_admin_update',
                full_table_name
            );
            
            -- Add DELETE policy (admin-only)
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (has_role(auth.uid(), ''admin''::app_role))',
                table_name || '_admin_delete',
                full_table_name
            );
            
            RAISE NOTICE 'Added admin-only policies to table: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Phase 1 Complete: All tables with RLS now have policies';
END $$;