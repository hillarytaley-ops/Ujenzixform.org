-- Fix suppliers table security vulnerability
-- Create ultra-secure supplier contact access controls

-- First, create a more restrictive function to get supplier contact information
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid, requested_field text DEFAULT 'basic')
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    can_view_contact boolean,
    contact_person text,
    email text,
    phone text,
    address text,
    contact_field_access text,
    security_message text,
    access_restrictions text
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
        INSERT INTO supplier_contact_access_audit (
            user_id, supplier_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), supplier_uuid, requested_field,
            FALSE, 'Unauthenticated access attempt', 'critical'
        );
        RETURN;
    END IF;
    
    -- Get supplier record
    SELECT * INTO supplier_record 
    FROM suppliers 
    WHERE suppliers.id = supplier_uuid;
    
    IF supplier_record.id IS NULL THEN
        INSERT INTO supplier_contact_access_audit (
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
        -- Check for active purchase orders (last 30 days)
        SELECT EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.supplier_id = supplier_uuid 
            AND po.buyer_id = user_profile_record.id
            AND po.status IN ('confirmed', 'processing', 'shipped')
            AND po.created_at > NOW() - INTERVAL '30 days'
        ) INTO active_business_exists;
        
        -- Check for recent completed orders (last 90 days)
        SELECT EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.supplier_id = supplier_uuid 
            AND po.buyer_id = user_profile_record.id
            AND po.status = 'delivered'
            AND po.updated_at > NOW() - INTERVAL '90 days'
        ) INTO recent_business_relationship;
        
        IF active_business_exists THEN
            can_access_contact := TRUE;
            access_justification := 'active_purchase_order';
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
    
    -- Field-specific restrictions for suppliers
    IF can_access_contact AND requested_field != 'basic' THEN
        IF requested_field IN ('phone', 'all') AND NOT active_business_exists AND user_profile_record.role != 'admin' AND user_profile_record.id != supplier_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'phone_access_requires_active_purchase_order';
            risk_level := 'high';
        END IF;
        
        IF requested_field IN ('email', 'all') AND NOT (active_business_exists OR recent_business_relationship) AND user_profile_record.role != 'admin' AND user_profile_record.id != supplier_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'email_access_requires_business_relationship';
            risk_level := 'high';
        END IF;
    END IF;
    
    -- Log access attempt
    INSERT INTO supplier_contact_access_audit (
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
            WHEN active_business_exists THEN 'Full contact access for active orders'
            ELSE 'Limited access restrictions apply'
        END;
END;
$$;

-- Update the existing suppliers directory function to be more secure
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_secure()
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    contact_info_status text
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
    INSERT INTO supplier_contact_access_audit (
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

-- Add detection for potential supplier contact harvesting
CREATE OR REPLACE FUNCTION detect_supplier_contact_harvesting_patterns()
RETURNS TRIGGER AS $$
DECLARE
    recent_supplier_access_count INTEGER;
    recent_contact_requests INTEGER;
    user_role TEXT;
BEGIN
    SELECT COUNT(DISTINCT supplier_id) INTO recent_supplier_access_count
    FROM supplier_contact_access_audit
    WHERE user_id = NEW.user_id
    AND supplier_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT COUNT(*) INTO recent_contact_requests
    FROM supplier_contact_access_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'address', 'all')
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    IF (recent_supplier_access_count > 5 OR recent_contact_requests > 10) AND user_role != 'admin' THEN
        INSERT INTO supplier_contact_access_audit (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for harvesting detection
DROP TRIGGER IF EXISTS supplier_contact_harvesting_detection ON supplier_contact_access_audit;
CREATE TRIGGER supplier_contact_harvesting_detection
    AFTER INSERT ON supplier_contact_access_audit
    FOR EACH ROW
    EXECUTE FUNCTION detect_supplier_contact_harvesting_patterns();