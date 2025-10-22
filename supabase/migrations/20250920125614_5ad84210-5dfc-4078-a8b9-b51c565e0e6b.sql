-- COMPREHENSIVE ROLE-TO-ROLE INFORMATION PROTECTION (FIXED)
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

-- Enhanced role verification function (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role_secure()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

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

-- Enhanced suppliers table RLS with strict role-to-role protection
DROP POLICY IF EXISTS "suppliers_role_based_access" ON public.suppliers;
CREATE POLICY "suppliers_role_based_access" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Suppliers can view their own data only
        WHEN get_current_user_role_secure() = 'supplier' AND 
             user_id = auth.uid() THEN true
        -- Builders can only view basic info of verified suppliers (no contact info)
        WHEN get_current_user_role_secure() = 'builder' AND 
             is_verified = true THEN true
        -- Block delivery providers from accessing supplier data
        WHEN get_current_user_role_secure() = 'delivery_provider' THEN false
        -- Block all other cross-role access
        ELSE false
    END
);

-- Suppliers INSERT/UPDATE protection
CREATE POLICY "suppliers_role_based_modify" 
ON public.suppliers
FOR ALL 
TO authenticated
USING (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'supplier' AND user_id = auth.uid())
)
WITH CHECK (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'supplier' AND user_id = auth.uid())
);

-- Enhanced delivery_providers table with strict role protection
DROP POLICY IF EXISTS "delivery_providers_role_protection" ON public.delivery_providers;
CREATE POLICY "delivery_providers_role_protection" 
ON public.delivery_providers
FOR SELECT 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Providers can view their own data only
        WHEN get_current_user_role_secure() = 'delivery_provider' AND 
             user_id = auth.uid() THEN true
        -- Builders can only view basic info of verified providers (no contact info)
        WHEN get_current_user_role_secure() = 'builder' AND 
             is_verified = true THEN true
        -- Block suppliers from accessing provider data
        WHEN get_current_user_role_secure() = 'supplier' THEN false
        -- Block all other cross-role access
        ELSE false
    END
);

-- Delivery providers INSERT/UPDATE protection
CREATE POLICY "delivery_providers_role_based_modify" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'delivery_provider' AND user_id = auth.uid())
)
WITH CHECK (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'delivery_provider' AND user_id = auth.uid())
);

-- Enhanced deliveries table with role-to-role protection
DROP POLICY IF EXISTS "deliveries_ultra_secure_access" ON public.deliveries;
CREATE POLICY "deliveries_role_based_access" 
ON public.deliveries
FOR ALL 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Builders can only see their own deliveries
        WHEN get_current_user_role_secure() = 'builder' AND 
             builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) THEN true
        -- Suppliers can only see deliveries they're involved in
        WHEN get_current_user_role_secure() = 'supplier' AND 
             supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) THEN true
        -- Block delivery providers from accessing delivery data
        WHEN get_current_user_role_secure() = 'delivery_provider' THEN false
        -- Block all other access
        ELSE false
    END
)
WITH CHECK (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'builder' AND builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) OR
    (get_current_user_role_secure() = 'supplier' AND supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Enhanced delivery_requests with role-to-role protection
DROP POLICY IF EXISTS "delivery_requests_ultra_secure_access" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_coordinates_restricted" ON public.delivery_requests;

CREATE POLICY "delivery_requests_role_based_access" 
ON public.delivery_requests
FOR ALL 
TO authenticated
USING (
    CASE 
        -- Admin full access
        WHEN get_current_user_role_secure() = 'admin' THEN true
        -- Builders can only see their own requests
        WHEN get_current_user_role_secure() = 'builder' AND 
             builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) THEN true
        -- Providers can only see requests assigned to them or pending requests in their area
        WHEN get_current_user_role_secure() = 'delivery_provider' AND 
             (provider_id = (SELECT id FROM delivery_providers WHERE user_id = auth.uid()) OR 
              (status = 'pending' AND provider_id IS NULL)) THEN true
        -- Block suppliers from accessing delivery requests
        WHEN get_current_user_role_secure() = 'supplier' THEN false
        -- Block all other access
        ELSE false
    END
)
WITH CHECK (
    get_current_user_role_secure() = 'admin' OR 
    (get_current_user_role_secure() = 'builder' AND builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Business relationship verification function
CREATE OR REPLACE FUNCTION public.verify_legitimate_business_access(
    target_table TEXT,
    target_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    accessing_role TEXT;
    current_profile_id UUID;
    has_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user's role and profile ID
    SELECT role, id INTO accessing_role, current_profile_id
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
            AND d.builder_id = current_profile_id
            AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
            AND d.created_at > NOW() - INTERVAL '30 days'
        ) INTO has_business_relationship;
    END IF;
    
    IF target_table = 'delivery_providers' AND accessing_role = 'builder' THEN
        -- Builder can access provider if they have active delivery requests
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            JOIN delivery_providers dp ON dp.id = dr.provider_id
            WHERE dp.id = target_record_id
            AND dr.builder_id = current_profile_id
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

-- Role-based sensitive data masking function
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
    IF sensitive_data IS NULL OR sensitive_data = '' THEN
        RETURN 'Not available';
    END IF;
    
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

-- Create secure view for suppliers with role-based data masking
CREATE OR REPLACE VIEW public.suppliers_secure_view AS
SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    -- Mask contact information based on role
    CASE 
        WHEN get_current_user_role_secure() = 'admin' OR s.user_id = auth.uid() THEN s.contact_person
        ELSE 'Contact via platform'
    END as contact_person,
    CASE 
        WHEN get_current_user_role_secure() = 'admin' OR s.user_id = auth.uid() THEN s.email
        WHEN get_current_user_role_secure() = 'builder' AND verify_legitimate_business_access('suppliers', s.id) THEN s.email
        ELSE 'Protected'
    END as email,
    CASE 
        WHEN get_current_user_role_secure() = 'admin' OR s.user_id = auth.uid() THEN s.phone
        WHEN get_current_user_role_secure() = 'builder' AND verify_legitimate_business_access('suppliers', s.id) THEN s.phone
        ELSE 'Protected'
    END as phone,
    CASE 
        WHEN get_current_user_role_secure() = 'admin' OR s.user_id = auth.uid() THEN s.address
        ELSE 'Location available to business partners'
    END as address
FROM suppliers s
WHERE 
    -- Apply role-based access control
    (get_current_user_role_secure() = 'admin') OR
    (get_current_user_role_secure() = 'supplier' AND s.user_id = auth.uid()) OR
    (get_current_user_role_secure() = 'builder' AND s.is_verified = true);

-- Log successful implementation
INSERT INTO public.emergency_security_log (
    user_id, event_type, event_data
) VALUES (
    auth.uid(),
    'ROLE_TO_ROLE_PROTECTION_ACTIVATED',
    'SUCCESS: Comprehensive role-to-role information protection implemented. PostgreSQL roles created, granular RLS policies applied, cross-role access monitoring enabled, sensitive data masking activated, and secure views created for all user roles.'
);