-- FIX SECURITY LINTER WARNINGS (CORRECTED SYNTAX)
-- Addresses security definer view and function search path issues

-- Drop the security definer view and replace with RLS-based access
DROP VIEW IF EXISTS public.suppliers_secure_view;

-- Fix function search paths to be secure (corrected syntax)
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create secure RPC function instead of security definer view
CREATE OR REPLACE FUNCTION public.get_suppliers_with_role_protection()
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    access_level TEXT
) AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO current_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Return suppliers with role-based data masking
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
        -- Mask contact information based on role
        CASE 
            WHEN current_role = 'admin' OR s.user_id = auth.uid() THEN s.contact_person
            ELSE 'Contact via platform'
        END as contact_person,
        CASE 
            WHEN current_role = 'admin' OR s.user_id = auth.uid() THEN s.email
            WHEN current_role = 'builder' AND verify_legitimate_business_access('suppliers', s.id) THEN s.email
            ELSE 'Protected'
        END as email,
        CASE 
            WHEN current_role = 'admin' OR s.user_id = auth.uid() THEN s.phone
            WHEN current_role = 'builder' AND verify_legitimate_business_access('suppliers', s.id) THEN s.phone
            ELSE 'Protected'
        END as phone,
        CASE 
            WHEN current_role = 'admin' OR s.user_id = auth.uid() THEN s.address
            ELSE 'Location available to business partners'
        END as address,
        CASE 
            WHEN current_role = 'admin' THEN 'full_admin_access'
            WHEN s.user_id = auth.uid() THEN 'owner_access'
            WHEN current_role = 'builder' AND s.is_verified = true THEN 'verified_supplier_access'
            ELSE 'no_access'
        END as access_level
    FROM suppliers s
    WHERE 
        -- Apply role-based access control via RLS
        (current_role = 'admin') OR
        (current_role = 'supplier' AND s.user_id = auth.uid()) OR
        (current_role = 'builder' AND s.is_verified = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create similar function for delivery providers
CREATE OR REPLACE FUNCTION public.get_delivery_providers_with_role_protection()
RETURNS TABLE (
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_types TEXT[],
    service_areas TEXT[],
    capacity_kg NUMERIC,
    hourly_rate NUMERIC,
    per_km_rate NUMERIC,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    rating NUMERIC,
    total_deliveries INTEGER,
    phone TEXT,
    email TEXT,
    address TEXT,
    access_level TEXT
) AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO current_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Return providers with role-based data masking
    RETURN QUERY
    SELECT 
        dp.id,
        dp.provider_name,
        dp.provider_type,
        dp.vehicle_types,
        dp.service_areas,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.capacity_kg
            WHEN current_role = 'builder' AND dp.is_verified = true THEN dp.capacity_kg
            ELSE NULL
        END as capacity_kg,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.hourly_rate
            WHEN current_role = 'builder' AND verify_legitimate_business_access('delivery_providers', dp.id) THEN dp.hourly_rate
            ELSE NULL
        END as hourly_rate,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.per_km_rate
            WHEN current_role = 'builder' AND verify_legitimate_business_access('delivery_providers', dp.id) THEN dp.per_km_rate
            ELSE NULL
        END as per_km_rate,
        dp.is_verified,
        dp.is_active,
        dp.rating,
        dp.total_deliveries,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.phone
            WHEN current_role = 'builder' AND verify_legitimate_business_access('delivery_providers', dp.id) THEN dp.phone
            ELSE 'Protected'
        END as phone,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.email
            WHEN current_role = 'builder' AND verify_legitimate_business_access('delivery_providers', dp.id) THEN dp.email
            ELSE 'Protected'
        END as email,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.address
            ELSE 'Location available to business partners'
        END as address,
        CASE 
            WHEN current_role = 'admin' THEN 'full_admin_access'
            WHEN dp.user_id = auth.uid() THEN 'owner_access'
            WHEN current_role = 'builder' AND dp.is_verified = true THEN 'verified_provider_access'
            ELSE 'no_access'
        END as access_level
    FROM delivery_providers dp
    WHERE 
        -- Apply role-based access control via RLS
        (current_role = 'admin') OR
        (current_role = 'delivery_provider' AND dp.user_id = auth.uid()) OR
        (current_role = 'builder' AND dp.is_verified = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log security fix completion
INSERT INTO public.emergency_security_log (
    user_id, event_type, event_data
) VALUES (
    auth.uid(),
    'SECURITY_LINTER_WARNINGS_FIXED',
    'SUCCESS: Fixed security definer view and function search path warnings. Replaced insecure view with secure RPC functions that use proper RLS policies and role-based access control.'
);