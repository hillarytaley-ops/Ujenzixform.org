-- Phase 1 Complete: Add secure default policies to all tables with RLS but no policies
-- Strategy: Admin-only access as the secure default, can be relaxed later per business requirements

DO $$
DECLARE
    table_name text;
    tables_fixed integer := 0;
BEGIN
    -- Iterate through all tables with RLS enabled but no policies
    FOR table_name IN
        SELECT DISTINCT t.tablename
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
        AND NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = t.schemaname
            AND p.tablename = t.tablename
        )
    LOOP
        -- Add admin-only policy (secure default)
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))',
            table_name || '_admin_only',
            table_name
        );
        
        tables_fixed := tables_fixed + 1;
        RAISE NOTICE 'Added admin-only policy to table: %', table_name;
    END LOOP;
    
    RAISE NOTICE 'Phase 1 Complete: Added policies to % tables', tables_fixed;
    RAISE NOTICE 'All tables now have RLS policies protecting data';
    RAISE NOTICE 'Next step: Review and adjust policies based on business requirements';
END $$;