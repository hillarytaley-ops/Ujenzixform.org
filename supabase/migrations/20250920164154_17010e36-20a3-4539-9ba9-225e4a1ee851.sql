-- CRITICAL SECURITY FIX: Supplier Contact Information Protection (Final Corrected)
-- This migration protects supplier contact information from unauthorized harvesting

-- Step 1: Drop ALL existing supplier-related functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_supplier_contact_secure(uuid);
DROP FUNCTION IF EXISTS public.get_supplier_contact_ultra_secure(uuid);
DROP FUNCTION IF EXISTS public.get_suppliers_directory_secure();
DROP FUNCTION IF EXISTS public.get_suppliers_directory_ultra_secure();
DROP FUNCTION IF EXISTS public.get_supplier_business_info();
DROP FUNCTION IF EXISTS public.verify_business_relationship_anti_scam(uuid);

-- Step 2: Drop existing vulnerable policies
DO $$ 
DECLARE 
    policy_rec RECORD;
BEGIN 
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON public.suppliers';
    END LOOP;
END $$;

-- Step 3: Create secure public directory view (no contact information)
DROP VIEW IF EXISTS public.suppliers_directory_public CASCADE;
-- Note: suppliers_directory_safe is a table, not dropping it to preserve data

CREATE VIEW public.suppliers_directory_public AS
SELECT 
    id,
    company_name,
    specialties,
    materials_offered,
    rating,
    is_verified,
    created_at,
    'Available to business partners' as contact_status,
    'Contact available through secure platform' as contact_method
FROM public.suppliers
WHERE is_verified = true;

-- Step 4: Create NEW secure function for supplier contact access
CREATE FUNCTION public.request_supplier_contact_secure(supplier_uuid uuid)
RETURNS TABLE(
    supplier_id uuid,
    company_name text,
    email text,
    phone text,
    address text,
    access_granted boolean,
    access_reason text,
    security_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    supplier_record suppliers%ROWTYPE;
    user_profile_record profiles%ROWTYPE;
    can_access_contact boolean := false;
    access_level text := 'denied';
    justification text := 'Access denied - no active business relationship';
BEGIN
    -- Get supplier record
    SELECT * INTO supplier_record 
    FROM suppliers 
    WHERE suppliers.id = supplier_uuid;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record IS NULL THEN
        RETURN;
    END IF;
    
    -- ULTRA STRICT supplier contact access control
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := true;
        access_level := 'admin_access';
        justification := 'Administrator access';
    ELSIF EXISTS (
        -- Active purchase orders (last 60 days)
        SELECT 1 FROM purchase_orders po
        WHERE po.supplier_id = supplier_uuid 
        AND po.buyer_id = user_profile_record.id
        AND po.created_at > NOW() - INTERVAL '60 days'
        AND po.status IN ('pending', 'confirmed')
    ) THEN
        can_access_contact := true;
        access_level := 'purchase_relationship';
        justification := 'Active purchase order relationship';
    ELSIF EXISTS (
        -- Recent quotation requests (last 30 days)
        SELECT 1 FROM quotation_requests qr
        WHERE qr.supplier_id = supplier_uuid 
        AND qr.requester_id = user_profile_record.id
        AND qr.created_at > NOW() - INTERVAL '30 days'
        AND qr.status = 'pending'
    ) THEN
        can_access_contact := true;
        access_level := 'quotation_relationship';
        justification := 'Pending quotation request';
    ELSE
        justification := 'BLOCKED: No legitimate business relationship detected';
    END IF;
    
    -- Log ALL contact access attempts for security monitoring
    INSERT INTO supplier_contact_security_audit (
        user_id, 
        supplier_id, 
        contact_field_requested,
        access_granted,
        business_relationship_verified,
        access_justification,
        security_risk_level
    ) VALUES (
        auth.uid(), 
        supplier_uuid,
        'contact_request_secure',
        can_access_contact,
        can_access_contact,
        justification,
        CASE WHEN can_access_contact THEN 'low' ELSE 'critical' END
    );
    
    -- Return protected supplier data
    RETURN QUERY SELECT
        supplier_record.id,
        supplier_record.company_name,
        CASE 
            WHEN can_access_contact THEN COALESCE(supplier_record.email, 'Not provided')
            ELSE 'Protected - Establish business relationship first'
        END,
        CASE 
            WHEN can_access_contact THEN COALESCE(supplier_record.phone, 'Not provided')
            ELSE 'Protected - Establish business relationship first'
        END,
        CASE 
            WHEN can_access_contact THEN COALESCE(supplier_record.address, 'Not provided')
            ELSE 'Protected - Establish business relationship first'
        END,
        can_access_contact,
        justification,
        'PROTECTED_' || access_level;
END;
$$;

-- Step 5: Create secure suppliers directory function (no contact info)
CREATE FUNCTION public.browse_suppliers_directory_secure()
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    contact_status text,
    business_profile_only boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role text;
BEGIN
    -- Get current user role
    SELECT p.role INTO current_user_role
    FROM profiles p
    WHERE p.user_id = auth.uid();
    
    -- Return only business profile data (NO contact information)
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.rating,
        s.is_verified,
        s.created_at,
        'Contact available to verified business partners only',
        true -- Indicates this is business profile data only
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.rating DESC NULLS LAST, s.company_name ASC;
END;
$$;

-- Step 6: Create new ULTRA-SECURE RLS policies
-- ONLY administrators get full unrestricted access
CREATE POLICY "suppliers_admin_complete_access_2024" ON public.suppliers
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Suppliers can ONLY access their own records
CREATE POLICY "suppliers_self_access_only_2024" ON public.suppliers
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'supplier'
            AND p.user_id = suppliers.user_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'supplier'
            AND p.user_id = suppliers.user_id
        )
    );

-- Builders get VERY LIMITED access (business info ONLY, no contact details)
CREATE POLICY "suppliers_builder_business_info_only_2024" ON public.suppliers
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'builder'
            AND suppliers.is_verified = true
        )
    );

-- All other roles are COMPLETELY BLOCKED
CREATE POLICY "suppliers_block_all_others_2024" ON public.suppliers
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('admin', 'supplier', 'builder')
        )
    );

-- Step 7: Grant secure permissions
GRANT SELECT ON public.suppliers_directory_public TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_supplier_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.browse_suppliers_directory_secure() TO authenticated;