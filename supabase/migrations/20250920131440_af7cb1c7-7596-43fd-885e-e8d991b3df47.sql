-- CRITICAL SECURITY FIX: Remove user access to security audit tables
-- Security events must be admin-only to prevent tampering

-- Remove dangerous user-facing policies on security_events table
DROP POLICY IF EXISTS "Users can view their own security events" ON security_events;
DROP POLICY IF EXISTS "Users can insert their own security events" ON security_events;

-- Remove duplicate policies on trusted_devices
DROP POLICY IF EXISTS "Users can manage their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can view their own trusted devices" ON trusted_devices;

-- Verify all critical security tables have proper admin-only access
-- Create comprehensive verification of security posture
CREATE OR REPLACE FUNCTION verify_security_lockdown()
RETURNS TABLE(
    table_name text, 
    rls_enabled boolean, 
    admin_only_secured boolean, 
    security_status text
) AS $$
DECLARE
    rec RECORD;
    user_accessible_policies INTEGER;
BEGIN
    FOR rec IN 
        SELECT t.tablename 
        FROM pg_tables t
        WHERE t.schemaname = 'public' 
        AND (t.tablename LIKE '%audit%' 
             OR t.tablename LIKE '%security%' 
             OR t.tablename LIKE '%log%'
             OR t.tablename = 'emergency_lockdown_log'
             OR t.tablename = 'emergency_security_log')
        ORDER BY t.tablename
    LOOP
        -- Count policies that allow non-admin access
        SELECT COUNT(*) INTO user_accessible_policies
        FROM pg_policies p
        WHERE p.schemaname = 'public' 
        AND p.tablename = rec.tablename
        AND p.qual NOT LIKE '%admin%'
        AND p.qual NOT LIKE '%is_admin%'
        AND p.qual != 'true'  -- System policies
        AND p.qual IS NOT NULL;
        
        table_name := rec.tablename;
        
        -- Check if RLS is enabled
        SELECT t.rowsecurity INTO rls_enabled
        FROM pg_tables t 
        WHERE t.schemaname = 'public' AND t.tablename = rec.tablename;
        
        -- Determine security status
        admin_only_secured := (user_accessible_policies = 0);
        
        security_status := CASE 
            WHEN NOT rls_enabled THEN 'CRITICAL: RLS NOT ENABLED'
            WHEN user_accessible_policies > 0 THEN 'HIGH RISK: User access detected'
            ELSE 'SECURE: Admin-only access'
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run security verification
SELECT * FROM verify_security_lockdown()
WHERE security_status != 'SECURE: Admin-only access'
ORDER BY 
    CASE security_status 
        WHEN 'CRITICAL: RLS NOT ENABLED' THEN 1
        WHEN 'HIGH RISK: User access detected' THEN 2
        ELSE 3
    END,
    table_name;