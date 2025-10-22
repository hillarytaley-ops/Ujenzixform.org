-- ====================================================
-- SECURITY FIX: Protect Supplier Contact Information from Unauthorized Access
-- Fixed version - drops existing policies first
-- ====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin only access to supplier contact audit logs" ON supplier_contact_security_audit;
DROP POLICY IF EXISTS "suppliers_working" ON suppliers;

-- Create audit table for supplier contact access (if not exists)
CREATE TABLE IF NOT EXISTS supplier_contact_security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    supplier_id UUID,
    contact_field_requested TEXT NOT NULL,
    access_granted BOOLEAN DEFAULT FALSE,
    business_relationship_verified BOOLEAN DEFAULT FALSE,
    access_justification TEXT,
    security_risk_level TEXT DEFAULT 'high',
    sensitive_fields_accessed TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;

-- Create admin-only access policy for audit logs
CREATE POLICY "Admin only access to supplier contact audit logs"
ON supplier_contact_security_audit
FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
));

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
        -- Check for active purchase orders (last 30 days) - using fallback since purchase_orders may not exist
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.status IN ('pending', 'accepted', 'in_progress')
            AND dr.builder_id = user_profile_record.id
            AND EXISTS (
                SELECT 1 FROM deliveries d 
                WHERE d.supplier_id = supplier_uuid 
                AND d.builder_id = dr.builder_id
            )
            AND dr.created_at > NOW() - INTERVAL '30 days'
        ) INTO active_business_exists;
        
        -- Check for recent completed business (last 90 days)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.status = 'completed'
            AND dr.builder_id = user_profile_record.id
            AND EXISTS (
                SELECT 1 FROM deliveries d 
                WHERE d.supplier_id = supplier_uuid 
                AND d.builder_id = dr.builder_id
            )
            AND dr.updated_at > NOW() - INTERVAL '90 days'
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

-- Create harvesting detection function
CREATE OR REPLACE FUNCTION detect_supplier_contact_harvesting_patterns()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    recent_supplier_access_count INTEGER;
    recent_contact_requests INTEGER;
    user_role TEXT;
BEGIN
    SELECT COUNT(DISTINCT supplier_id) INTO recent_supplier_access_count
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND supplier_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT COUNT(*) INTO recent_contact_requests
    FROM supplier_contact_security_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'address', 'all')
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    IF (recent_supplier_access_count > 5 OR recent_contact_requests > 10) AND user_role != 'admin' THEN
        INSERT INTO supplier_contact_security_audit (
            user_id, supplier_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            NEW.user_id, NEW.supplier_id, 'HARVESTING_DETECTION',
            FALSE, 
            format('CRITICAL: Potential contact harvesting - %s suppliers, %s contact requests in 15min', 
                   recent_supplier_access_count, recent_contact_requests),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for contact harvesting detection
DROP TRIGGER IF EXISTS detect_supplier_contact_harvesting_trigger ON supplier_contact_security_audit;
CREATE TRIGGER detect_supplier_contact_harvesting_trigger
    AFTER INSERT ON supplier_contact_security_audit
    FOR EACH ROW
    EXECUTE FUNCTION detect_supplier_contact_harvesting_patterns();

-- Create new restrictive policies for suppliers table
CREATE POLICY "Suppliers restricted access with contact protection"
ON suppliers
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (
            p.role = 'admin' OR
            p.id = suppliers.user_id OR
            (
                p.role = 'builder' AND
                EXISTS (
                    SELECT 1 FROM delivery_requests dr
                    WHERE dr.builder_id = p.id
                    AND dr.status IN ('pending', 'accepted', 'in_progress', 'completed')
                    AND dr.created_at > NOW() - INTERVAL '90 days'
                    AND EXISTS (
                        SELECT 1 FROM deliveries d 
                        WHERE d.supplier_id = suppliers.id 
                        AND d.builder_id = dr.builder_id
                    )
                )
            )
        )
    )
);

-- Allow suppliers to update their own records
CREATE POLICY "Suppliers can update own records"
ON suppliers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (p.role = 'admin' OR p.id = suppliers.user_id)
    )
);

-- Allow suppliers to insert their own records
CREATE POLICY "Suppliers can insert own records"
ON suppliers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (p.role = 'admin' OR p.id = suppliers.user_id)
    )
);

-- Log this security enhancement
INSERT INTO emergency_security_log (
    event_type, 
    user_id, 
    event_data
) VALUES (
    'SUPPLIER_CONTACT_SECURITY_ENHANCED',
    auth.uid(),
    'Implemented ultra-strict contact information protection with business relationship verification and harvesting detection'
);