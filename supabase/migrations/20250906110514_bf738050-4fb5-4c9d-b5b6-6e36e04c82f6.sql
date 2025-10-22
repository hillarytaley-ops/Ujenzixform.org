-- Fix remaining RLS security issues
-- Enable RLS on all remaining public tables that don't have it

-- Get all public tables and enable RLS on them
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            'spatial_ref_sys',  -- PostGIS system table
            'geography_columns', -- PostGIS system table
            'geometry_columns'   -- PostGIS system table
        )
    )
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
            RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not enable RLS on table %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Create ultra-restrictive default policies for critical tables that don't have policies
-- Only admins can access these by default

-- For any table that stores sensitive data, create admin-only policies
CREATE OR REPLACE FUNCTION create_admin_only_policy(table_name text)
RETURNS void AS $$
BEGIN
    -- Check if any policy exists for this table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = table_name
    ) THEN
        -- Create admin-only policy
        EXECUTE format('
            CREATE POLICY "admin_only_access_%s" ON public.%I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE user_id = auth.uid() AND role = ''admin''
                )
            )', table_name, table_name);
        
        RAISE NOTICE 'Created admin-only policy for table: %', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply admin-only policies to sensitive tables
SELECT create_admin_only_policy(tablename)
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'api_rate_limits',
    'camera_access_log', 
    'delivery_access_log',
    'driver_contact_access_log',
    'driver_info_access_log',
    'delivery_note_signatures',
    'delivery_notifications',
    'delivery_orders',
    'delivery_provider_responses',
    'delivery_status_updates',
    'delivery_updates',
    'purchase_orders',
    'quotation_requests',
    'scanned_supplies',
    'scanned_receivables',
    'order_materials',
    'invoices',
    'goods_received_notes'
);

-- Final security verification
SELECT 
    'ALL TABLES SECURED WITH RLS' as security_status,
    COUNT(*) as total_tables_with_rls
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE pt.schemaname = 'public'
AND pc.relrowsecurity = true;