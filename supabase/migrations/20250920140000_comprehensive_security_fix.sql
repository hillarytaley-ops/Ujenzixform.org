-- ====================================================
-- COMPREHENSIVE SECURITY FIX FOR CRITICAL VULNERABILITIES
-- Addresses: delivery_providers_public_safe, delivery_providers, suppliers
-- ====================================================

-- Issue 1: delivery_providers_public_safe table publicly accessible
-- Issue 2: delivery_providers table with overly permissive policies  
-- Issue 3: suppliers table exposing contact information without business verification

-- ====================================================
-- PART 1: FIX DELIVERY_PROVIDERS_PUBLIC_SAFE TABLE
-- ====================================================

-- Drop the problematic view and recreate with proper restrictions
DROP VIEW IF EXISTS delivery_providers_public_safe CASCADE;

-- Create business relationship verification table for audit trail
CREATE TABLE IF NOT EXISTS business_relationship_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id),
    target_provider_id UUID REFERENCES delivery_providers(id),
    target_supplier_id UUID REFERENCES suppliers(id),
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('delivery_request', 'purchase_order', 'quotation_request')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired', 'denied')),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the verification table
ALTER TABLE business_relationship_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for verification table
CREATE POLICY "Users can view their own verification requests" ON business_relationship_verifications
    FOR SELECT USING (requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all verifications" ON business_relationship_verifications  
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Create secure function to verify business relationships
CREATE OR REPLACE FUNCTION verify_business_relationship(
    target_provider_id UUID DEFAULT NULL,
    target_supplier_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile_id UUID;
    relationship_exists BOOLEAN := FALSE;
BEGIN
    -- Get current user's profile ID
    SELECT id INTO current_user_profile_id
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for delivery provider relationships
    IF target_provider_id IS NOT NULL THEN
        -- Check for active delivery requests in last 30 days
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = target_provider_id
            AND dr.builder_id = current_user_profile_id
            AND dr.status IN ('accepted', 'in_progress', 'completed')
            AND dr.created_at > NOW() - INTERVAL '30 days'
        ) INTO relationship_exists;
        
        IF relationship_exists THEN
            -- Log the verification
            INSERT INTO business_relationship_verifications (
                requester_id, target_provider_id, relationship_type, 
                verification_status, verified_at, expires_at
            ) VALUES (
                current_user_profile_id, target_provider_id, 'delivery_request',
                'verified', NOW(), NOW() + INTERVAL '7 days'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Check for supplier relationships
    IF target_supplier_id IS NOT NULL THEN
        -- Check for purchase orders or quotation requests in last 90 days
        SELECT EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.supplier_id = target_supplier_id
            AND po.buyer_id = current_user_profile_id
            AND po.created_at > NOW() - INTERVAL '90 days'
            
            UNION
            
            SELECT 1 FROM quotation_requests qr
            WHERE qr.supplier_id = target_supplier_id
            AND qr.requester_id = current_user_profile_id
            AND qr.created_at > NOW() - INTERVAL '90 days'
        ) INTO relationship_exists;
        
        IF relationship_exists THEN
            -- Log the verification
            INSERT INTO business_relationship_verifications (
                requester_id, target_supplier_id, relationship_type, 
                verification_status, verified_at, expires_at
            ) VALUES (
                current_user_profile_id, target_supplier_id, 'purchase_order',
                'verified', NOW(), NOW() + INTERVAL '30 days'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN relationship_exists;
END;
$$;

-- Create secure delivery providers directory function
CREATE OR REPLACE FUNCTION get_secure_delivery_providers_directory()
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_types TEXT[],
    service_areas TEXT[],
    capacity_kg NUMERIC,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    rating NUMERIC,
    total_deliveries INTEGER,
    contact_availability TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Return only basic, non-sensitive information
    RETURN QUERY
    SELECT 
        dp.id,
        dp.provider_name,
        dp.provider_type,
        dp.vehicle_types,
        dp.service_areas,
        dp.capacity_kg,
        dp.is_verified,
        dp.is_active,
        dp.rating,
        dp.total_deliveries,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Contact available'
            WHEN verify_business_relationship(dp.id, NULL) THEN 'Contact via platform'
            ELSE 'Contact after business verification'
        END as contact_availability,
        dp.created_at,
        dp.updated_at
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE 
    AND dp.is_active = TRUE;
END;
$$;

-- ====================================================
-- PART 2: FIX DELIVERY_PROVIDERS TABLE POLICIES
-- ====================================================

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "ultra_secure_provider_data_protection" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_full_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_own_data_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_builder_limited_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_owner_manage_own" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_authorized_business_contact" ON delivery_providers;

-- Create new ultra-secure policies
CREATE POLICY "delivery_providers_admin_access" ON delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "delivery_providers_owner_access" ON delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'delivery_provider'
            AND id = delivery_providers.user_id
        )
    );

-- Secure function for verified contact access
CREATE OR REPLACE FUNCTION get_provider_contact_secure(provider_id UUID)
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    can_access BOOLEAN,
    access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    provider_record delivery_providers%ROWTYPE;
    has_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get provider record
    SELECT * INTO provider_record
    FROM delivery_providers dp
    WHERE dp.id = provider_id;
    
    IF provider_record IS NULL THEN
        RAISE EXCEPTION 'Provider not found';
    END IF;
    
    -- Check access permissions
    IF current_user_profile.role = 'admin' OR current_user_profile.id = provider_record.user_id THEN
        has_relationship := TRUE;
    ELSE
        has_relationship := verify_business_relationship(provider_id, NULL);
    END IF;
    
    -- Return data based on access level
    RETURN QUERY
    SELECT 
        provider_record.id,
        provider_record.provider_name,
        CASE WHEN has_relationship THEN provider_record.phone ELSE 'Protected' END,
        CASE WHEN has_relationship THEN provider_record.email ELSE 'Protected' END,
        CASE WHEN has_relationship THEN provider_record.address ELSE 'Protected' END,
        has_relationship,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Admin access'
            WHEN current_user_profile.id = provider_record.user_id THEN 'Owner access'
            WHEN has_relationship THEN 'Verified business relationship'
            ELSE 'No verified relationship'
        END;
END;
$$;

-- ====================================================
-- PART 3: FIX SUPPLIERS TABLE POLICIES
-- ====================================================

-- Drop all existing policies on suppliers
DROP POLICY IF EXISTS "Restricted supplier access for business partners only" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can view supplier business info" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their own data" ON suppliers;
DROP POLICY IF EXISTS "Registered users can create supplier profiles" ON suppliers;
DROP POLICY IF EXISTS "Suppliers: Admin full access" ON suppliers;
DROP POLICY IF EXISTS "Suppliers: Manage own profile" ON suppliers;
DROP POLICY IF EXISTS "Suppliers: Authenticated basic view only" ON suppliers;

-- Create new secure policies for suppliers
CREATE POLICY "suppliers_admin_access" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "suppliers_owner_access" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'supplier'
            AND id = suppliers.user_id
        )
    );

-- Create secure suppliers directory function  
CREATE OR REPLACE FUNCTION get_secure_suppliers_directory()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    contact_availability TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Return only basic, non-sensitive information
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.rating,
        s.is_verified,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Contact available'
            WHEN verify_business_relationship(NULL, s.id) THEN 'Contact via platform'
            ELSE 'Contact after business verification'
        END as contact_availability,
        s.created_at,
        s.updated_at
    FROM suppliers s
    WHERE s.is_verified = TRUE;
END;
$$;

-- Secure function for verified supplier contact access
CREATE OR REPLACE FUNCTION get_supplier_contact_secure(supplier_id UUID)
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    can_access BOOLEAN,
    access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    supplier_record suppliers%ROWTYPE;
    has_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get supplier record
    SELECT * INTO supplier_record
    FROM suppliers s
    WHERE s.id = supplier_id;
    
    IF supplier_record IS NULL THEN
        RAISE EXCEPTION 'Supplier not found';
    END IF;
    
    -- Check access permissions
    IF current_user_profile.role = 'admin' OR current_user_profile.id = supplier_record.user_id THEN
        has_relationship := TRUE;
    ELSE
        has_relationship := verify_business_relationship(NULL, supplier_id);
    END IF;
    
    -- Return data based on access level
    RETURN QUERY
    SELECT 
        supplier_record.id,
        supplier_record.company_name,
        CASE WHEN has_relationship THEN supplier_record.contact_person ELSE 'Protected' END,
        CASE WHEN has_relationship THEN supplier_record.phone ELSE 'Protected' END,
        CASE WHEN has_relationship THEN supplier_record.email ELSE 'Protected' END,
        CASE WHEN has_relationship THEN supplier_record.address ELSE 'Protected' END,
        has_relationship,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Admin access'
            WHEN current_user_profile.id = supplier_record.user_id THEN 'Owner access'
            WHEN has_relationship THEN 'Verified business relationship'
            ELSE 'No verified relationship'
        END;
END;
$$;

-- ====================================================
-- PART 4: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions to authenticated users for directory functions
GRANT EXECUTE ON FUNCTION get_secure_delivery_providers_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION get_secure_suppliers_directory() TO authenticated;

-- Grant execute permissions for contact functions (they have internal security checks)
GRANT EXECUTE ON FUNCTION get_provider_contact_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_contact_secure(UUID) TO authenticated;

-- Grant execute permissions for verification function
GRANT EXECUTE ON FUNCTION verify_business_relationship(UUID, UUID) TO authenticated;

-- ====================================================
-- PART 5: SECURITY AUDIT LOG
-- ====================================================

-- Create security audit log entry
INSERT INTO emergency_lockdown_log (
    lockdown_timestamp, 
    applied_by_user, 
    security_level,
    affected_tables,
    description
) VALUES (
    NOW(), 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
    'CRITICAL_SECURITY_FIX_APPLIED',
    ARRAY['delivery_providers', 'delivery_providers_public_safe', 'suppliers', 'business_relationship_verifications'],
    'Comprehensive security fix: Implemented business relationship verification, removed public access to sensitive data, added field-level access controls'
);

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Verify policies are in place
SELECT 
    'SECURITY FIX VERIFICATION' as status,
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('delivery_providers', 'suppliers', 'business_relationship_verifications')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify functions exist
SELECT 
    'SECURITY FUNCTIONS VERIFICATION' as status,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN (
    'get_secure_delivery_providers_directory',
    'get_secure_suppliers_directory', 
    'get_provider_contact_secure',
    'get_supplier_contact_secure',
    'verify_business_relationship'
)
ORDER BY proname;
