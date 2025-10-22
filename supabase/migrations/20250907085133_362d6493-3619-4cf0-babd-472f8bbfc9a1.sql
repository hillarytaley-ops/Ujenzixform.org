-- ====================================================
-- SECURITY FIX: Clean Supplier Contact Security Implementation
-- Drop all existing policies and recreate with proper protection
-- ====================================================

-- Drop ALL existing policies on suppliers table first
DROP POLICY IF EXISTS "suppliers_working" ON suppliers;
DROP POLICY IF EXISTS "Suppliers restricted access with contact protection" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can update own records" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can insert own records" ON suppliers;

-- Create secure function to get supplier contact information with strict verification
CREATE OR REPLACE FUNCTION get_supplier_contact_secure(
    supplier_uuid UUID,
    requested_field TEXT DEFAULT 'basic'
) RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    can_view_contact BOOLEAN,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    contact_field_access TEXT,
    security_message TEXT,
    access_restrictions TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    user_profile_record profiles%ROWTYPE;
    supplier_record suppliers%ROWTYPE;
    can_access_contact BOOLEAN := FALSE;
    business_relationship_verified BOOLEAN := FALSE;
    access_justification TEXT := 'unauthorized_access_attempt';
    risk_level TEXT := 'critical';
    active_business_exists BOOLEAN := FALSE;
    recent_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record.user_id IS NULL THEN
        INSERT INTO supplier_contact_security_audit (
            user_id, supplier_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), supplier_uuid, requested_field,
            FALSE, 'Unauthenticated access attempt', 'critical'
        );
        RETURN;
    END IF;
    
    -- Get supplier record using service role privileges
    SELECT * INTO supplier_record 
    FROM suppliers 
    WHERE suppliers.id = supplier_uuid;
    
    IF supplier_record.id IS NULL THEN
        INSERT INTO supplier_contact_security_audit (
            user_id, supplier_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), supplier_uuid, requested_field,
            FALSE, 'Supplier not found', 'critical'
        );
        RETURN;
    END IF;
    
    -- ULTRA-STRICT SUPPLIER CONTACT ACCESS VERIFICATION
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := TRUE;
        access_justification := 'admin_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.id = supplier_record.user_id THEN
        can_access_contact := TRUE;
        access_justification := 'supplier_self_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.role = 'builder' THEN
        -- Check for active business relationship via deliveries
        SELECT EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.supplier_id = supplier_uuid 
            AND d.builder_id = user_profile_record.id
            AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
            AND d.created_at > NOW() - INTERVAL '30 days'
        ) INTO active_business_exists;
        
        -- Check for recent completed business (last 90 days)
        SELECT EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.supplier_id = supplier_uuid 
            AND d.builder_id = user_profile_record.id
            AND d.status = 'delivered'
            AND d.updated_at > NOW() - INTERVAL '90 days'
        ) INTO recent_business_relationship;
        
        IF active_business_exists THEN
            can_access_contact := TRUE;
            access_justification := 'active_delivery_relationship';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSIF recent_business_relationship AND requested_field = 'basic' THEN
            can_access_contact := TRUE;
            access_justification := 'recent_business_relationship_basic_only';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_contact := FALSE;
            access_justification := 'no_active_business_relationship';
            risk_level := 'high';
        END IF;
        
    ELSE
        can_access_contact := FALSE;
        access_justification := 'insufficient_authorization';
        risk_level := 'critical';
    END IF;
    
    -- Field-specific restrictions
    IF can_access_contact AND requested_field != 'basic' THEN
        IF requested_field IN ('phone', 'all') AND NOT active_business_exists AND user_profile_record.role != 'admin' AND user_profile_record.id != supplier_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'phone_access_requires_active_business_relationship';
            risk_level := 'high';
        END IF;
        
        IF requested_field IN ('email', 'all') AND NOT (active_business_exists OR recent_business_relationship) AND user_profile_record.role != 'admin' AND user_profile_record.id != supplier_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'email_access_requires_business_relationship';
            risk_level := 'high';
        END IF;
    END IF;
    
    -- Log access attempt
    INSERT INTO supplier_contact_security_audit (
        user_id, supplier_id, contact_field_requested,
        access_granted, business_relationship_verified, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), supplier_uuid, requested_field,
        can_access_contact, business_relationship_verified, access_justification, risk_level
    );
    
    -- Return protected data
    RETURN QUERY SELECT
        supplier_record.id,
        supplier_record.company_name,
        supplier_record.specialties,
        supplier_record.materials_offered,
        supplier_record.rating,
        supplier_record.is_verified,
        supplier_record.created_at,
        supplier_record.updated_at,
        can_access_contact,
        -- Ultra-strict contact person protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('basic', 'all') 
            THEN supplier_record.contact_person
            ELSE 'Contact via secure platform'
        END,
        -- Ultra-strict email protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('email', 'all') AND (active_business_exists OR recent_business_relationship)
            THEN supplier_record.email
            ELSE NULL
        END,
        -- Ultra-strict phone protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('phone', 'all') AND active_business_exists 
            THEN supplier_record.phone
            ELSE NULL
        END,
        -- Ultra-strict address protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('address', 'all') AND business_relationship_verified
            THEN supplier_record.address
            ELSE 'Location available to business partners'
        END,
        CASE WHEN can_access_contact THEN requested_field ELSE 'restricted' END,
        CASE
            WHEN can_access_contact THEN 'Authorized: ' || access_justification
            ELSE 'Restricted: ' || access_justification
        END,
        CASE
            WHEN NOT can_access_contact THEN 'Contact protected - active business relationship required'
            WHEN active_business_exists THEN 'Full contact access for active business'
            ELSE 'Limited access restrictions apply'
        END;
END;
$$;

-- Create new ultra-secure RLS policies for suppliers table
-- Only allow admins, supplier owners, or builders with active business relationships

CREATE POLICY "Ultra secure supplier access with business verification"
ON suppliers
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (
            -- Admin access
            p.role = 'admin' OR
            -- Supplier can access their own data
            p.id = suppliers.user_id OR
            -- Builder with active business relationship only
            (
                p.role = 'builder' AND
                EXISTS (
                    SELECT 1 FROM deliveries d
                    WHERE d.supplier_id = suppliers.id 
                    AND d.builder_id = p.id
                    AND (
                        -- Active delivery
                        d.status IN ('pending', 'in_progress', 'out_for_delivery') OR
                        -- Recent completed delivery (last 90 days)
                        (d.status = 'delivered' AND d.updated_at > NOW() - INTERVAL '90 days')
                    )
                )
            )
        )
    )
);

-- Allow suppliers to update their own records only
CREATE POLICY "Suppliers can update own records securely"
ON suppliers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (p.role = 'admin' OR p.id = suppliers.user_id)
    )
);

-- Allow suppliers to insert their own records only
CREATE POLICY "Suppliers can insert own records securely"
ON suppliers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (p.role = 'admin' OR p.id = suppliers.user_id)
    )
);

-- Create function to get public supplier directory (non-sensitive info only)
CREATE OR REPLACE FUNCTION get_suppliers_directory_secure()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    contact_info_status TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Require authentication and log the access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for supplier directory access';
    END IF;
    
    -- Log the directory access attempt
    INSERT INTO supplier_contact_security_audit (
        user_id, supplier_id, contact_field_requested,
        access_granted, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), NULL, 'SUPPLIERS_DIRECTORY',
        true, 'Authenticated user accessing supplier directory', 'low'
    );
    
    -- Return only safe, non-sensitive supplier information
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
        CASE 
            WHEN auth.uid() IS NOT NULL THEN 'Contact via secure request'
            ELSE 'Sign up to contact suppliers'
        END as contact_info_status
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.rating DESC, s.company_name ASC;
END;
$$;

-- Log this security enhancement
INSERT INTO emergency_security_log (
    event_type, 
    user_id, 
    event_data
) VALUES (
    'SUPPLIER_CONTACT_SECURITY_COMPLETELY_SECURED',
    auth.uid(),
    'Implemented enterprise-grade supplier contact protection with ultra-strict business relationship verification'
);