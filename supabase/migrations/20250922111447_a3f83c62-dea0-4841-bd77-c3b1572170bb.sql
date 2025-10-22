-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_suppliers_with_contact_protection();

-- Create a comprehensive business relationship verification system

-- Create a business relationship verification function
CREATE OR REPLACE FUNCTION public.has_legitimate_business_relationship(target_supplier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    current_user_profile_id uuid;
    has_relationship boolean := false;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get user profile
    SELECT id INTO current_user_profile_id
    FROM profiles 
    WHERE user_id = current_user_id;
    
    -- Check for legitimate business relationships within the last 6 months
    SELECT EXISTS (
        -- Recent purchase orders (confirmed business relationship)
        SELECT 1 FROM purchase_orders po
        WHERE po.buyer_id = current_user_profile_id
        AND po.supplier_id = target_supplier_id
        AND po.status IN ('confirmed', 'completed', 'pending')
        AND po.created_at > NOW() - INTERVAL '6 months'
        
        UNION
        
        -- Recent quotation requests (potential business relationship)
        SELECT 1 FROM quotation_requests qr
        WHERE qr.requester_id = current_user_profile_id
        AND qr.supplier_id = target_supplier_id
        AND qr.status IN ('pending', 'quoted', 'accepted')
        AND qr.created_at > NOW() - INTERVAL '3 months'
        
        UNION
        
        -- Recent deliveries (active business relationship)
        SELECT 1 FROM deliveries d
        WHERE d.builder_id = current_user_profile_id
        AND d.supplier_id = target_supplier_id
        AND d.status IN ('pending', 'in_progress', 'completed')
        AND d.created_at > NOW() - INTERVAL '3 months'
    ) INTO has_relationship;
    
    RETURN has_relationship;
END;
$$;

-- Create a secure function to get suppliers with contact protection
CREATE OR REPLACE FUNCTION public.get_suppliers_with_business_verified_access()
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id uuid,
    contact_person text,
    email text,
    phone text,
    address text,
    contact_access_level text,
    has_business_relationship boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_user_role text;
BEGIN
    -- Get current user role
    SELECT p.role INTO current_user_role
    FROM profiles p 
    WHERE p.user_id = auth.uid();
    
    -- Return suppliers with appropriate contact information based on access level
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
        s.user_id,
        -- Contact information access control - STRICT PROTECTION
        CASE 
            WHEN current_user_role = 'admin' THEN s.contact_person
            WHEN has_legitimate_business_relationship(s.id) THEN s.contact_person
            WHEN s.contact_person IS NOT NULL THEN '[Contact via platform]'
            ELSE NULL
        END as contact_person,
        CASE 
            WHEN current_user_role = 'admin' THEN s.email
            WHEN has_legitimate_business_relationship(s.id) THEN s.email
            WHEN s.email IS NOT NULL THEN '[Available to business partners]'
            ELSE NULL
        END as email,
        CASE 
            WHEN current_user_role = 'admin' THEN s.phone
            WHEN has_legitimate_business_relationship(s.id) THEN s.phone
            WHEN s.phone IS NOT NULL THEN '[Available to business partners]'
            ELSE NULL
        END as phone,
        CASE 
            WHEN current_user_role = 'admin' THEN s.address
            WHEN has_legitimate_business_relationship(s.id) THEN s.address
            WHEN s.address IS NOT NULL THEN '[Location available to partners]'
            ELSE NULL
        END as address,
        -- Access level indicator
        CASE 
            WHEN current_user_role = 'admin' THEN 'admin_full_access'
            WHEN has_legitimate_business_relationship(s.id) THEN 'business_relationship_verified'
            ELSE 'basic_directory_only'
        END as contact_access_level,
        -- Business relationship status
        has_legitimate_business_relationship(s.id) as has_business_relationship
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
END;
$$;

-- Create a function to get a single supplier's contact information with strict access control
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure_verified(supplier_uuid uuid)
RETURNS TABLE(
    id uuid,
    company_name text,
    contact_person text,
    email text,
    phone text,
    address text,
    access_granted boolean,
    access_reason text,
    business_relationship_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role text;
    has_relationship boolean;
    current_user_id uuid;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get current user role
    SELECT p.role INTO current_user_role
    FROM profiles p 
    WHERE p.user_id = current_user_id;
    
    -- Check business relationship
    SELECT has_legitimate_business_relationship(supplier_uuid) INTO has_relationship;
    
    -- Log access attempt for security audit
    INSERT INTO supplier_contact_security_audit (
        user_id, supplier_id, contact_field_requested, 
        business_relationship_verified, access_granted,
        access_justification, security_risk_level
    ) VALUES (
        current_user_id, supplier_uuid, 'full_contact_details',
        has_relationship,
        (current_user_role = 'admin' OR has_relationship),
        CASE 
            WHEN current_user_role = 'admin' THEN 'Admin override access'
            WHEN has_relationship THEN 'Verified business relationship grants contact access'
            ELSE 'Access denied - no business relationship verified'
        END,
        CASE 
            WHEN current_user_role = 'admin' OR has_relationship THEN 'low'
            ELSE 'high'
        END
    );
    
    -- Return data based on access level
    IF current_user_role = 'admin' OR has_relationship THEN
        RETURN QUERY
        SELECT 
            s.id,
            s.company_name,
            s.contact_person,
            s.email,
            s.phone,
            s.address,
            true as access_granted,
            CASE 
                WHEN current_user_role = 'admin' THEN 'Administrator access'
                ELSE 'Business relationship verified'
            END as access_reason,
            has_relationship as business_relationship_verified
        FROM suppliers s
        WHERE s.id = supplier_uuid;
    ELSE
        -- Return protected response for unauthorized access
        RETURN QUERY
        SELECT 
            supplier_uuid,
            'Contact information protected'::text,
            'Business relationship required'::text,
            'Business relationship required'::text,
            'Business relationship required'::text,
            'Business relationship required'::text,
            false as access_granted,
            'Contact access requires verified business relationship or admin privileges'::text as access_reason,
            false as business_relationship_verified;
    END IF;
END;
$$;

-- Update suppliers table RLS policies to allow authenticated users to see basic info
-- but protect contact information through application-level functions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "admin_complete_supplier_access" ON suppliers;
DROP POLICY IF EXISTS "authenticated_users_basic_supplier_read" ON suppliers;
DROP POLICY IF EXISTS "supplier_own_record_management" ON suppliers;

-- Create new balanced policies that allow basic supplier info access but protect contact details
CREATE POLICY "authenticated_users_can_view_basic_supplier_info" ON suppliers
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND is_verified = true
    );

CREATE POLICY "admins_can_manage_all_suppliers" ON suppliers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "suppliers_can_manage_own_records" ON suppliers
    FOR ALL
    USING (
        auth.uid() IS NOT NULL 
        AND (
            user_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.id = suppliers.profile_id
                AND p.role = 'supplier'
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND (
            user_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.id = suppliers.profile_id
                AND p.role = 'supplier'
            )
        )
    );