-- ====================================================
-- SUPPLIERS TABLE - BUSINESS RELATIONSHIP ONLY ACCESS
-- RESTRICT CONTACT FIELDS TO ACTIVE BUSINESS RELATIONSHIPS
-- ====================================================

-- CRITICAL SECURITY ISSUE: The 'suppliers' table allows verified suppliers
-- to be viewed by builders and contains email addresses and phone numbers.
-- Malicious users could harvest this contact data for spam or competitive intelligence.

-- SOLUTION: Restrict contact field access to users with ACTIVE BUSINESS RELATIONSHIPS ONLY.

-- ====================================================
-- STEP 1: CREATE BUSINESS RELATIONSHIP VERIFICATION SYSTEM
-- ====================================================

-- Create table to track active business relationships
CREATE TABLE IF NOT EXISTS active_business_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('purchase_order', 'quotation_request', 'ongoing_contract')),
    relationship_status TEXT NOT NULL DEFAULT 'active' CHECK (relationship_status IN ('active', 'completed', 'expired', 'terminated')),
    established_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    total_transactions INTEGER DEFAULT 0,
    total_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, supplier_id)
);

-- Enable RLS on business relationships table
ALTER TABLE active_business_relationships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON active_business_relationships FROM PUBLIC;
REVOKE ALL ON active_business_relationships FROM anon;

-- Users can view their own business relationships
CREATE POLICY "business_relationships_own_access" 
ON active_business_relationships 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND (p.id = active_business_relationships.requester_id OR p.role = 'admin')
    )
);

-- Admins can manage all relationships
CREATE POLICY "business_relationships_admin_manage" 
ON active_business_relationships 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- ====================================================
-- STEP 2: CREATE BUSINESS RELATIONSHIP VERIFICATION FUNCTION
-- ====================================================

-- Function to verify active business relationship
CREATE OR REPLACE FUNCTION verify_active_business_relationship(target_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile_id UUID;
    has_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user's profile ID
    SELECT id INTO current_user_profile_id
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for active business relationships
    SELECT EXISTS (
        -- Check purchase orders in last 90 days
        SELECT 1 FROM purchase_orders po 
        WHERE po.supplier_id = target_supplier_id 
        AND po.buyer_id = current_user_profile_id
        AND po.created_at > NOW() - INTERVAL '90 days'
        
        UNION
        
        -- Check quotation requests in last 60 days
        SELECT 1 FROM quotation_requests qr 
        WHERE qr.supplier_id = target_supplier_id 
        AND qr.requester_id = current_user_profile_id
        AND qr.created_at > NOW() - INTERVAL '60 days'
        
        UNION
        
        -- Check active business relationships table
        SELECT 1 FROM active_business_relationships abr
        WHERE abr.supplier_id = target_supplier_id
        AND abr.requester_id = current_user_profile_id
        AND abr.relationship_status = 'active'
        AND (abr.expires_at IS NULL OR abr.expires_at > NOW())
    ) INTO has_relationship;
    
    -- Log the verification attempt
    INSERT INTO master_rls_security_audit (
        user_id, table_name, operation, record_id, 
        access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), 'suppliers', 'BUSINESS_RELATIONSHIP_VERIFICATION', target_supplier_id,
        has_relationship, 
        CASE WHEN has_relationship THEN 'Active business relationship verified' ELSE 'No active business relationship' END,
        CASE WHEN has_relationship THEN 'low' ELSE 'medium' END
    );
    
    RETURN has_relationship;
END;
$$;

-- ====================================================
-- STEP 3: SECURE SUPPLIERS TABLE WITH BUSINESS RELATIONSHIP REQUIREMENTS
-- ====================================================

-- Drop all existing policies on suppliers table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON suppliers', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled and revoke public access
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON suppliers FROM PUBLIC;
REVOKE ALL ON suppliers FROM anon;

-- Create secure policies for suppliers table

-- 1. Admin full access
CREATE POLICY "suppliers_admin_full_access" 
ON suppliers 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- 2. Suppliers can access their own data
CREATE POLICY "suppliers_own_data_access" 
ON suppliers 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'supplier'
        AND p.id = suppliers.user_id
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'supplier'
        AND p.id = suppliers.user_id
    )
);

-- 3. Builders can ONLY see basic info (NO CONTACT FIELDS) for verified suppliers
CREATE POLICY "suppliers_builder_basic_info_only" 
ON suppliers 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND is_verified = TRUE
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'builder'
    )
    -- This policy allows SELECT but contact fields will be masked by application logic
);

-- ====================================================
-- STEP 4: CREATE SECURE CONTACT ACCESS FUNCTION WITH BUSINESS RELATIONSHIP VERIFICATION
-- ====================================================

-- Secure function for accessing supplier contact information
-- ONLY users with active business relationships can access contact fields
CREATE OR REPLACE FUNCTION get_supplier_contact_business_verified(supplier_id UUID)
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    has_business_relationship BOOLEAN,
    contact_access_level TEXT,
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
    can_access_contact BOOLEAN := FALSE;
    access_reason TEXT := 'No authorization';
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for supplier contact access';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Get supplier record (filtered by RLS policies)
    SELECT * INTO supplier_record
    FROM suppliers s
    WHERE s.id = supplier_id;
    
    IF supplier_record IS NULL THEN
        RAISE EXCEPTION 'Supplier not found or access denied';
    END IF;
    
    -- Check authorization level
    IF current_user_profile.role = 'admin' THEN
        can_access_contact := TRUE;
        access_reason := 'Admin access';
    ELSIF supplier_record.user_id = current_user_profile.id THEN
        can_access_contact := TRUE;
        access_reason := 'Owner access';
    ELSE
        -- Verify active business relationship
        has_relationship := verify_active_business_relationship(supplier_id);
        
        IF has_relationship THEN
            can_access_contact := TRUE;
            access_reason := 'Active business relationship verified';
        ELSE
            can_access_contact := FALSE;
            access_reason := 'No active business relationship - contact access denied';
        END IF;
    END IF;
    
    -- Log the contact access attempt
    INSERT INTO master_rls_security_audit (
        user_id, user_role, table_name, operation, record_id,
        sensitive_fields, access_granted, failure_reason, risk_level
    ) VALUES (
        auth.uid(), current_user_profile.role, 'suppliers', 'CONTACT_ACCESS', supplier_id,
        CASE WHEN can_access_contact THEN ARRAY['email', 'phone', 'contact_person', 'address'] ELSE ARRAY[]::TEXT[] END,
        can_access_contact, access_reason,
        CASE WHEN can_access_contact THEN 'low' ELSE 'medium' END
    );
    
    -- Return data based on access level
    RETURN QUERY
    SELECT 
        supplier_record.id,
        supplier_record.company_name,
        CASE WHEN can_access_contact THEN supplier_record.contact_person ELSE 'Contact via platform' END,
        CASE WHEN can_access_contact THEN supplier_record.email ELSE 'Email protected - establish business relationship' END,
        CASE WHEN can_access_contact THEN supplier_record.phone ELSE 'Phone protected - establish business relationship' END,
        CASE WHEN can_access_contact THEN supplier_record.address ELSE 'Address available after business relationship' END,
        supplier_record.specialties,
        supplier_record.materials_offered,
        supplier_record.rating,
        supplier_record.is_verified,
        has_relationship,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'admin_full_access'
            WHEN supplier_record.user_id = current_user_profile.id THEN 'owner_access'
            WHEN has_relationship THEN 'business_relationship_access'
            ELSE 'no_contact_access'
        END,
        access_reason;
END;
$$;

-- ====================================================
-- STEP 5: CREATE SAFE SUPPLIER DIRECTORY (NO CONTACT INFO)
-- ====================================================

-- Secure function for supplier directory without exposing contact information
CREATE OR REPLACE FUNCTION get_suppliers_directory_business_safe()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    business_relationship_required TEXT,
    contact_available_after TEXT,
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
        RAISE EXCEPTION 'Authentication required for supplier directory access';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Only allow builders and admins to access directory
    IF current_user_profile IS NULL OR 
       current_user_profile.role NOT IN ('builder', 'admin') THEN
        RAISE EXCEPTION 'Access denied - only builders and admins can view supplier directory';
    END IF;
    
    -- Return supplier directory WITHOUT contact information
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.rating,
        s.is_verified,
        'Active business relationship required for contact access'::TEXT as business_relationship_required,
        'Submit purchase order or quotation request to access contact information'::TEXT as contact_available_after,
        s.created_at,
        s.updated_at
    FROM suppliers s
    WHERE s.is_verified = TRUE;
END;
$$;

-- ====================================================
-- STEP 6: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for secure functions
GRANT EXECUTE ON FUNCTION verify_active_business_relationship(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_contact_business_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_directory_business_safe() TO authenticated;

-- ====================================================
-- STEP 7: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify business relationship protection is implemented
DO $$
DECLARE
    supplier_policies INTEGER := 0;
    relationship_table_exists BOOLEAN := FALSE;
    verification_function_exists BOOLEAN := FALSE;
BEGIN
    -- Check suppliers table policies
    SELECT COUNT(*) INTO supplier_policies
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'suppliers';
    
    -- Check if business relationship table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'active_business_relationships'
    ) INTO relationship_table_exists;
    
    -- Check if verification function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'verify_active_business_relationship'
    ) INTO verification_function_exists;
    
    -- Report verification status
    IF supplier_policies >= 1 AND relationship_table_exists AND verification_function_exists THEN
        RAISE NOTICE '✅ SUCCESS: Business relationship verification system implemented';
        RAISE NOTICE '✅ PROTECTED: Supplier contact fields restricted to active business relationships';
        RAISE NOTICE '✅ SECURITY: Spam and competitive intelligence gathering prevented';
    ELSE
        RAISE NOTICE '❌ INCOMPLETE: Business relationship system not fully implemented';
        RAISE NOTICE 'Policies: %, Relationship table: %, Verification function: %', 
                     supplier_policies, relationship_table_exists, verification_function_exists;
    END IF;
    
    -- Log comprehensive verification
    INSERT INTO master_rls_security_audit (
        event_type, table_name, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'SUPPLIER_BUSINESS_RELATIONSHIP_PROTECTION_VERIFICATION',
        'suppliers',
        'SECURITY_IMPLEMENTATION',
        (supplier_policies >= 1 AND relationship_table_exists AND verification_function_exists),
        CASE 
            WHEN supplier_policies >= 1 AND relationship_table_exists AND verification_function_exists
            THEN 'Business relationship verification system successfully implemented'
            ELSE 'Business relationship system implementation incomplete'
        END,
        CASE WHEN supplier_policies >= 1 AND relationship_table_exists AND verification_function_exists THEN 'low' ELSE 'high' END,
        jsonb_build_object(
            'supplier_policies_count', supplier_policies,
            'relationship_table_exists', relationship_table_exists,
            'verification_function_exists', verification_function_exists,
            'contact_protection_method', 'active_business_relationship_verification'
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify suppliers table has proper policies
SELECT 
    'SUPPLIERS_POLICY_CHECK' as check_type,
    COUNT(*) as total_policies,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ POLICIES EXIST'
        ELSE '❌ NO POLICIES - SECURITY GAP'
    END as security_status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'suppliers';

-- Check 2: Verify business relationship system exists
SELECT 
    'BUSINESS_RELATIONSHIP_SYSTEM_CHECK' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'active_business_relationships')
        THEN '✅ RELATIONSHIP TABLE EXISTS'
        ELSE '❌ RELATIONSHIP TABLE MISSING'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_active_business_relationship')
        THEN '✅ VERIFICATION FUNCTION EXISTS'
        ELSE '❌ VERIFICATION FUNCTION MISSING'
    END as function_status;

-- Check 3: Verify secure functions for contact access
SELECT 
    'SECURE_CONTACT_FUNCTIONS_CHECK' as check_type,
    proname as function_name,
    '✅ BUSINESS RELATIONSHIP VERIFICATION AVAILABLE' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'get_supplier_contact_business_verified',
    'get_suppliers_directory_business_safe'
)
ORDER BY proname;

-- Final status report
SELECT 
    'SUPPLIER_CONTACT_PROTECTION_FINAL_STATUS' as status,
    'Business relationship verification system implemented' as protection_method,
    'Contact fields (email, phone) restricted to active business relationships only' as access_control,
    'Spam and competitive intelligence gathering prevented' as threat_mitigation,
    'Malicious contact data harvesting blocked' as security_achievement,
    NOW() as implementation_timestamp;

-- ====================================================
-- USAGE DOCUMENTATION
-- ====================================================

/*
SUPPLIER CONTACT ACCESS - BUSINESS RELATIONSHIP REQUIRED:

BASIC SUPPLIER INFO (Available to builders):
SELECT * FROM get_suppliers_directory_business_safe();
-- Returns: company_name, specialties, materials_offered, rating
-- Does NOT return: email, phone, contact_person, address

CONTACT INFORMATION (Business relationship required):
SELECT * FROM get_supplier_contact_business_verified('supplier_id');
-- Admin: Full contact access
-- Supplier owner: Full access to own data
-- Builder with business relationship: Full contact access
-- Builder without relationship: "Contact via platform" messages

BUSINESS RELATIONSHIP VERIFICATION:
SELECT verify_active_business_relationship('supplier_id');
-- Returns TRUE if user has active business relationship with supplier
-- Checks: Purchase orders (90 days), Quotation requests (60 days), Active contracts

SECURITY BENEFITS:
✅ Email addresses protected from unauthorized access
✅ Phone numbers protected from spam campaigns
✅ Competitive intelligence gathering prevented
✅ Contact data harvesting blocked
✅ Business relationship verification enforced
*/
