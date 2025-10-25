-- Enhance delivery_providers table with provider type specific fields
-- Add company-specific fields
ALTER TABLE delivery_providers 
ADD COLUMN IF NOT EXISTS company_registration_number TEXT,
ADD COLUMN IF NOT EXISTS tax_identification_number TEXT,
ADD COLUMN IF NOT EXISTS business_license_number TEXT,
ADD COLUMN IF NOT EXISTS fleet_size INTEGER,
ADD COLUMN IF NOT EXISTS operating_years INTEGER,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;

-- Add individual-specific fields  
ALTER TABLE delivery_providers
ADD COLUMN IF NOT EXISTS national_id_number TEXT,
ADD COLUMN IF NOT EXISTS work_experience INTEGER,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Update provider_type to have better labels
ALTER TABLE delivery_providers 
ADD CONSTRAINT check_provider_type 
CHECK (provider_type IN ('individual', 'company'));

-- Create index for provider type filtering
CREATE INDEX IF NOT EXISTS idx_delivery_providers_type ON delivery_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_verified ON delivery_providers(is_verified);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_active ON delivery_providers(is_active);

-- Create function to get provider statistics by type
CREATE OR REPLACE FUNCTION get_delivery_provider_stats()
RETURNS TABLE(
    provider_type TEXT,
    total_count BIGINT,
    verified_count BIGINT,
    active_count BIGINT,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.provider_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE dp.is_verified = true) as verified_count,
        COUNT(*) FILTER (WHERE dp.is_active = true) as active_count,
        AVG(dp.rating) as avg_rating
    FROM delivery_providers dp
    GROUP BY dp.provider_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_delivery_provider_stats() TO authenticated;

-- Create function to validate provider type specific requirements
CREATE OR REPLACE FUNCTION validate_provider_requirements()
RETURNS TRIGGER AS $$
BEGIN
    -- For companies, require contact_person
    IF NEW.provider_type = 'company' AND (NEW.contact_person IS NULL OR NEW.contact_person = '') THEN
        RAISE EXCEPTION 'Contact person is required for delivery companies';
    END IF;
    
    -- For individuals, national_id_number is recommended
    IF NEW.provider_type = 'individual' AND NEW.national_id_number IS NULL THEN
        -- Just log a warning, don't block the insert
        RAISE NOTICE 'National ID number is recommended for individual providers';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER trigger_validate_provider_requirements
    BEFORE INSERT OR UPDATE ON delivery_providers
    FOR EACH ROW
    EXECUTE FUNCTION validate_provider_requirements();

-- Update the existing secure function to include new fields
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
    contact_person TEXT,
    -- Company fields
    company_registration_number TEXT,
    fleet_size INTEGER,
    operating_years INTEGER,
    insurance_policy_number TEXT,
    -- Individual fields
    work_experience INTEGER,
    emergency_contact_name TEXT,
    access_level TEXT
) AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO current_role
    FROM user_roles 
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
            ELSE NULL
        END as hourly_rate,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.per_km_rate
            ELSE NULL
        END as per_km_rate,
        dp.is_verified,
        dp.is_active,
        dp.rating,
        dp.total_deliveries,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.phone
            ELSE 'Protected'
        END as phone,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.email
            ELSE 'Protected'
        END as email,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.address
            ELSE CASE 
                WHEN array_length(dp.service_areas, 1) > 0 THEN dp.service_areas[1] || ' Area'
                ELSE 'Location Protected'
            END
        END as address,
        CASE 
            WHEN current_role = 'admin' OR dp.user_id = auth.uid() THEN dp.contact_person
            WHEN current_role = 'builder' AND dp.provider_type = 'company' THEN 'Contact Available'
            ELSE 'Protected'
        END as contact_person,
        -- Company fields (admin only)
        CASE 
            WHEN current_role = 'admin' THEN dp.company_registration_number
            ELSE NULL
        END as company_registration_number,
        CASE 
            WHEN current_role = 'admin' OR (current_role = 'builder' AND dp.is_verified = true) THEN dp.fleet_size
            ELSE NULL
        END as fleet_size,
        CASE 
            WHEN current_role = 'admin' OR (current_role = 'builder' AND dp.is_verified = true) THEN dp.operating_years
            ELSE NULL
        END as operating_years,
        CASE 
            WHEN current_role = 'admin' THEN dp.insurance_policy_number
            ELSE NULL
        END as insurance_policy_number,
        -- Individual fields (admin only)
        CASE 
            WHEN current_role = 'admin' OR (current_role = 'builder' AND dp.is_verified = true) THEN dp.work_experience
            ELSE NULL
        END as work_experience,
        CASE 
            WHEN current_role = 'admin' THEN dp.emergency_contact_name
            ELSE NULL
        END as emergency_contact_name,
        CASE 
            WHEN current_role = 'admin' THEN 'full'
            WHEN current_role = 'builder' THEN 'limited'
            ELSE 'none'
        END as access_level
    FROM delivery_providers dp
    WHERE dp.is_active = true
    ORDER BY dp.is_verified DESC, dp.rating DESC NULLS LAST, dp.total_deliveries DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_delivery_provider_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_providers_with_role_protection() TO authenticated;

-- Create view for public provider information (very limited)
CREATE OR REPLACE VIEW public_delivery_provider_info AS
SELECT 
    id,
    provider_name,
    provider_type,
    vehicle_types,
    service_areas,
    is_verified,
    rating,
    total_deliveries,
    CASE 
        WHEN provider_type = 'company' THEN 'Professional Delivery Company'
        ELSE 'Private Delivery Provider'
    END as provider_description
FROM delivery_providers
WHERE is_active = true AND is_verified = true;

-- Grant select on public view
GRANT SELECT ON public_delivery_provider_info TO anon, authenticated;



















