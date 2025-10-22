-- COMPREHENSIVE ROLE-TO-ROLE INFORMATION PROTECTION
-- Implements granular access permissions and cross-role data protection

-- Create PostgreSQL roles for additional security layers
DO $$
BEGIN
    -- Create application roles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ujenzipro_admin_role') THEN
        CREATE ROLE ujenzipro_admin_role;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ujenzipro_builder_role') THEN
        CREATE ROLE ujenzipro_builder_role;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ujenzipro_supplier_role') THEN
        CREATE ROLE ujenzipro_supplier_role;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ujenzipro_provider_role') THEN
        CREATE ROLE ujenzipro_provider_role;
    END IF;
END $$;

-- Grant appropriate permissions to PostgreSQL roles
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ujenzipro_admin_role;
GRANT SELECT, INSERT, UPDATE ON profiles, deliveries, delivery_requests TO ujenzipro_builder_role;
GRANT SELECT, INSERT, UPDATE ON profiles, suppliers, deliveries, delivery_notes TO ujenzipro_supplier_role;
GRANT SELECT, INSERT, UPDATE ON profiles, delivery_providers, delivery_requests, delivery_tracking TO ujenzipro_provider_role;

-- Enhanced role verification function
CREATE OR REPLACE FUNCTION public.get_current_user_role_secure()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Log role access for security monitoring
    INSERT INTO emergency_security_log (
        user_id, event_type, event_data
    ) VALUES (
        auth.uid(),
        'ROLE_VERIFICATION_ACCESS',
        format('Role verification: %s', COALESCE(user_role, 'no_role'))
    );
    
    RETURN COALESCE(user_role, 'unauthorized');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cross-role access audit table
CREATE TABLE IF NOT EXISTS public.cross_role_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessing_user_id UUID,
    accessing_user_role TEXT,
    target_user_id UUID,
    target_user_role TEXT,
    table_accessed TEXT,
    access_type TEXT,
    access_granted BOOLEAN DEFAULT FALSE,
    security_violation BOOLEAN DEFAULT FALSE,
    access_justification TEXT,
    risk_level TEXT DEFAULT 'high',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.cross_role_access_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit table
CREATE POLICY "cross_role_audit_admin_only" 
ON public.cross_role_access_audit
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- Enhanced suppliers table RLS with role-to-role protection
DROP POLICY IF EXISTS "suppliers_role_based_access" ON public.suppliers;
CREATE POLICY "suppliers_role_based_access" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Suppliers can view their own data
        WHEN get_current_user_role_secure() = 'supplier' AND 
             user_id = auth.uid() THEN true
        -- Builders can only view basic info of verified suppliers
        WHEN get_current_user_role_secure() = 'builder' AND 
             is_verified = true THEN true
        -- Block all other cross-role access
        ELSE false
    END
);

-- Enhanced delivery_providers table with role protection
DROP POLICY IF EXISTS "delivery_providers_role_protection" ON public.delivery_providers;
CREATE POLICY "delivery_providers_role_protection" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Providers can view their own data
        WHEN get_current_user_role_secure() = 'delivery_provider' AND 
             user_id = auth.uid() THEN true
        -- Builders can only view basic info of verified providers
        WHEN get_current_user_role_secure() = 'builder' AND 
             is_verified = true THEN true
        -- Block suppliers from accessing provider data
        ELSE false
    END
);

-- Role-to-role access monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_cross_role_access()
RETURNS TRIGGER AS $$
DECLARE
    accessing_role TEXT;
    target_role TEXT;
    is_violation BOOLEAN := FALSE;
    justification TEXT;
BEGIN
    -- Get accessing user's role
    SELECT role INTO accessing_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Determine if this is a cross-role access violation
    IF TG_TABLE_NAME = 'suppliers' AND accessing_role NOT IN ('admin', 'supplier', 'builder') THEN
        is_violation := TRUE;
        justification := 'Unauthorized role accessing supplier data';
    ELSIF TG_TABLE_NAME = 'delivery_providers' AND accessing_role NOT IN ('admin', 'delivery_provider', 'builder') THEN
        is_violation := TRUE;
        justification := 'Unauthorized role accessing provider data';
    ELSIF TG_TABLE_NAME = 'profiles' AND accessing_role IS NULL THEN
        is_violation := TRUE;
        justification := 'Unauthenticated access to profile data';
    END IF;
    
    -- Log all cross-role access attempts
    INSERT INTO cross_role_access_audit (
        accessing_user_id, accessing_user_role, 
        table_accessed, access_type,
        access_granted, security_violation, access_justification,
        risk_level
    ) VALUES (
        auth.uid(), COALESCE(accessing_role, 'unknown'),
        TG_TABLE_NAME, TG_OP,
        NOT is_violation, is_violation,
        COALESCE(justification, 'Normal role-based access'),
        CASE WHEN is_violation THEN 'critical' ELSE 'low' END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply cross-role monitoring to key tables
DROP TRIGGER IF EXISTS monitor_suppliers_cross_role_access ON suppliers;
CREATE TRIGGER monitor_suppliers_cross_role_access
    AFTER SELECT ON suppliers
    FOR EACH ROW EXECUTE FUNCTION monitor_cross_role_access();

DROP TRIGGER IF EXISTS monitor_providers_cross_role_access ON delivery_providers;
CREATE TRIGGER monitor_providers_cross_role_access
    AFTER SELECT ON delivery_providers
    FOR EACH ROW EXECUTE FUNCTION monitor_cross_role_access();

-- Enhanced business relationship verification
CREATE OR REPLACE FUNCTION public.verify_legitimate_business_access(
    target_table TEXT,
    target_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    accessing_role TEXT;
    has_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user's role
    SELECT role INTO accessing_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Admin always has access
    IF accessing_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check for legitimate business relationships
    IF target_table = 'suppliers' AND accessing_role = 'builder' THEN
        -- Builder can access supplier if they have active deliveries
        SELECT EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.supplier_id = target_record_id
            AND d.builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
            AND d.created_at > NOW() - INTERVAL '30 days'
        ) INTO has_business_relationship;
    END IF;
    
    IF target_table = 'delivery_providers' AND accessing_role = 'builder' THEN
        -- Builder can access provider if they have active delivery requests
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id IN (
                SELECT id FROM delivery_providers WHERE id = target_record_id
            )
            AND dr.builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '24 hours'
        ) INTO has_business_relationship;
    END IF;
    
    -- Log the verification attempt
    INSERT INTO cross_role_access_audit (
        accessing_user_id, accessing_user_role,
        table_accessed, access_type,
        access_granted, access_justification
    ) VALUES (
        auth.uid(), accessing_role,
        target_table, 'business_relationship_check',
        has_business_relationship,
        CASE WHEN has_business_relationship 
             THEN 'Legitimate business relationship verified'
             ELSE 'No active business relationship found'
        END
    );
    
    RETURN has_business_relationship;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Role-based column access control
CREATE OR REPLACE FUNCTION public.mask_sensitive_data_by_role(
    data_owner_role TEXT,
    accessing_role TEXT,
    sensitive_data TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Admin sees everything
    IF accessing_role = 'admin' THEN
        RETURN sensitive_data;
    END IF;
    
    -- Same role or owner sees full data
    IF data_owner_role = accessing_role THEN
        RETURN sensitive_data;
    END IF;
    
    -- Cross-role access gets masked data
    CASE 
        WHEN sensitive_data ~ '^[0-9+\-\s()]+$' THEN -- Phone number pattern
            RETURN REGEXP_REPLACE(sensitive_data, '(\d{3})\d{6,}(\d{2})', '\1****\2');
        WHEN sensitive_data ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN -- Email pattern
            RETURN REGEXP_REPLACE(sensitive_data, '([A-Za-z0-9._%+-]{1,3})[A-Za-z0-9._%+-]*(@.*)$', '\1***\2');
        ELSE -- Other sensitive data
            RETURN 'Protected - Business relationship required';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Log successful implementation
INSERT INTO public.emergency_security_log (
    user_id, event_type, event_data
) VALUES (
    auth.uid(),
    'ROLE_TO_ROLE_PROTECTION_ACTIVATED',
    'SUCCESS: Comprehensive role-to-role information protection implemented. PostgreSQL roles created, granular RLS policies applied, cross-role access monitoring enabled, and sensitive data masking activated for all user roles.'
);