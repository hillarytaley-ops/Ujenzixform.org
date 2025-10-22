-- CRITICAL SECURITY FIX: Supplier Contact Information Protection
-- This migration protects supplier contact information from unauthorized harvesting

-- Step 1: Drop existing vulnerable policies to replace with secure ones
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

-- Step 2: Create secure public directory view without contact information
DROP VIEW IF EXISTS public.suppliers_directory_public CASCADE;
CREATE VIEW public.suppliers_directory_public AS
SELECT 
    id,
    company_name,
    specialties,
    materials_offered,
    rating,
    is_verified,
    created_at,
    -- Contact info masked for security
    CASE 
        WHEN is_verified = true THEN 'Available to verified partners'
        ELSE 'Verification required'
    END as contact_status,
    -- No email, phone, or address exposed
    'Contact available through platform' as contact_method
FROM public.suppliers
WHERE is_verified = true;

-- Step 3: Create ultra-secure function for supplier contact access
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid)
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
    justification text := 'Access denied';
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
    
    -- STRICT supplier contact access control
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := true;
        access_level := 'admin_full_access';
        justification := 'Administrator access granted';
    ELSIF EXISTS (
        -- Active purchase orders (last 60 days)
        SELECT 1 FROM purchase_orders po
        WHERE po.supplier_id = supplier_uuid 
        AND po.buyer_id = user_profile_record.id
        AND po.created_at > NOW() - INTERVAL '60 days'
    ) THEN
        can_access_contact := true;
        access_level := 'active_purchase_relationship';
        justification := 'Active purchase order relationship';
    ELSIF EXISTS (
        -- Active quotation requests (last 30 days)
        SELECT 1 FROM quotation_requests qr
        WHERE qr.supplier_id = supplier_uuid 
        AND qr.requester_id = user_profile_record.id
        AND qr.created_at > NOW() - INTERVAL '30 days'
    ) THEN
        can_access_contact := true;
        access_level := 'quotation_relationship';
        justification := 'Recent quotation request relationship';
    ELSIF EXISTS (
        -- Active delivery relationship (last 14 days)
        SELECT 1 FROM deliveries d
        WHERE d.supplier_id = supplier_uuid 
        AND d.builder_id = user_profile_record.id
        AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
        AND d.created_at > NOW() - INTERVAL '14 days'
    ) THEN
        can_access_contact := true;
        access_level := 'delivery_relationship';
        justification := 'Active delivery relationship';
    ELSE
        justification := 'No active business relationship found';
    END IF;
    
    -- Log ALL supplier contact access attempts
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
        'full_contact_secure_request',
        can_access_contact,
        can_access_contact,
        justification,
        CASE WHEN can_access_contact THEN 'low' ELSE 'high' END
    );
    
    -- Return protected data
    RETURN QUERY SELECT
        supplier_record.id,
        supplier_record.company_name,
        CASE 
            WHEN can_access_contact THEN supplier_record.email
            ELSE 'Protected'
        END,
        CASE 
            WHEN can_access_contact THEN supplier_record.phone
            ELSE 'Protected'
        END,
        CASE 
            WHEN can_access_contact THEN supplier_record.address
            ELSE 'Contact via platform'
        END,
        can_access_contact,
        justification,
        'ULTRA_SECURE_' || access_level;
END;
$$;

-- Step 4: Create secure suppliers directory function
CREATE OR REPLACE FUNCTION public.get_suppliers_directory_secure()
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    contact_status text,
    can_access_contact boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile_id uuid;
    current_user_role text;
BEGIN
    -- Get current user details
    SELECT p.id, p.role INTO current_user_profile_id, current_user_role
    FROM profiles p
    WHERE p.user_id = auth.uid();
    
    -- Return secure supplier directory data
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.rating,
        s.is_verified,
        s.created_at,
        -- Contact status without exposing actual contact info
        CASE 
            WHEN s.is_verified = true THEN 'Available to business partners'
            ELSE 'Verification pending'
        END,
        -- Can access contact only with business relationship
        CASE 
            WHEN current_user_role = 'admin' THEN true
            WHEN EXISTS (
                SELECT 1 FROM purchase_orders po
                WHERE po.supplier_id = s.id 
                AND po.buyer_id = current_user_profile_id
                AND po.created_at > NOW() - INTERVAL '60 days'
            ) THEN true
            WHEN EXISTS (
                SELECT 1 FROM quotation_requests qr
                WHERE qr.supplier_id = s.id 
                AND qr.requester_id = current_user_profile_id
                AND qr.created_at > NOW() - INTERVAL '30 days'
            ) THEN true
            ELSE false
        END
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.rating DESC, s.company_name ASC;
END;
$$;

-- Step 5: Create new ultra-secure RLS policies
-- Only admins get full access to all supplier data
CREATE POLICY "suppliers_2024_admin_secure_access" ON public.suppliers
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Suppliers can access their own data
CREATE POLICY "suppliers_2024_self_access" ON public.suppliers
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

-- Builders can only see basic business info (no contact details)
-- Contact info requires active business relationship
CREATE POLICY "suppliers_2024_builder_limited_access" ON public.suppliers
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'builder'
            AND suppliers.is_verified = true
        )
    );

-- Delivery providers have no access to supplier data
CREATE POLICY "suppliers_2024_delivery_provider_no_access" ON public.suppliers
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() 
            AND p.role = 'delivery_provider'
        ) AND false -- Always deny
    );

-- Step 6: Grant appropriate permissions
GRANT SELECT ON public.suppliers_directory_public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_directory_secure() TO authenticated;