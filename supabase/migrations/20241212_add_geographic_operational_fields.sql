-- Add geographic and operational fields to suppliers table
-- Migration: 20241212_add_geographic_operational_fields.sql

-- Add geographic columns
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) CHECK (latitude >= -90 AND latitude <= 90),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) CHECK (longitude >= -180 AND longitude <= 180),
ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER DEFAULT 50 CHECK (delivery_radius_km >= 0 AND delivery_radius_km <= 1000),
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add operational columns
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "08:00", "close": "13:00"}, "sunday": {"closed": true}}'::jsonb,
ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'Active' CHECK (operational_status IN ('Active', 'Temporarily Closed', 'Seasonal', 'Inactive')),
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS languages_supported TEXT[] DEFAULT ARRAY['English', 'Swahili'];

-- Create indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_suppliers_location ON public.suppliers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_suppliers_delivery_radius ON public.suppliers(delivery_radius_km);
CREATE INDEX IF NOT EXISTS idx_suppliers_county ON public.suppliers(county);
CREATE INDEX IF NOT EXISTS idx_suppliers_operational_status ON public.suppliers(operational_status);

-- Create spatial index for location-based searches (if PostGIS is available)
-- Note: This requires PostGIS extension
-- CREATE INDEX IF NOT EXISTS idx_suppliers_geom ON public.suppliers USING GIST (ST_Point(longitude, latitude));

-- Add comments for documentation
COMMENT ON COLUMN public.suppliers.latitude IS 'Latitude coordinate for business location';
COMMENT ON COLUMN public.suppliers.longitude IS 'Longitude coordinate for business location';
COMMENT ON COLUMN public.suppliers.delivery_radius_km IS 'Delivery radius in kilometers';
COMMENT ON COLUMN public.suppliers.county IS 'County where the business is located';
COMMENT ON COLUMN public.suppliers.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.suppliers.business_hours IS 'JSON object containing business hours for each day';
COMMENT ON COLUMN public.suppliers.operational_status IS 'Current operational status of the business';
COMMENT ON COLUMN public.suppliers.website_url IS 'Company website URL';
COMMENT ON COLUMN public.suppliers.social_media IS 'JSON object containing social media links';
COMMENT ON COLUMN public.suppliers.languages_supported IS 'Array of languages supported by the business';

-- Create function to find suppliers within delivery radius
CREATE OR REPLACE FUNCTION public.find_suppliers_in_radius(
    target_lat DECIMAL(10,8),
    target_lng DECIMAL(11,8),
    max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    delivery_radius_km INTEGER,
    distance_km DECIMAL(10,2),
    average_rating DECIMAL(3,2),
    total_reviews INTEGER,
    business_type TEXT,
    operational_status TEXT
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.company_name,
        s.address,
        s.latitude,
        s.longitude,
        s.delivery_radius_km,
        -- Calculate distance using Haversine formula (approximate)
        ROUND(
            (6371 * acos(
                cos(radians(target_lat)) * 
                cos(radians(s.latitude)) * 
                cos(radians(s.longitude) - radians(target_lng)) + 
                sin(radians(target_lat)) * 
                sin(radians(s.latitude))
            ))::numeric, 2
        ) as distance_km,
        s.average_rating,
        s.total_reviews,
        s.business_type,
        s.operational_status
    FROM public.suppliers s
    WHERE 
        s.latitude IS NOT NULL 
        AND s.longitude IS NOT NULL
        AND s.operational_status = 'Active'
        AND s.is_verified = true
        -- Filter by delivery radius
        AND (
            6371 * acos(
                cos(radians(target_lat)) * 
                cos(radians(s.latitude)) * 
                cos(radians(s.longitude) - radians(target_lng)) + 
                sin(radians(target_lat)) * 
                sin(radians(s.latitude))
            )
        ) <= LEAST(s.delivery_radius_km, max_distance_km)
    ORDER BY distance_km ASC;
$$;

-- Create function to check if supplier delivers to location
CREATE OR REPLACE FUNCTION public.supplier_delivers_to_location(
    supplier_uuid UUID,
    target_lat DECIMAL(10,8),
    target_lng DECIMAL(11,8)
)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = supplier_uuid
        AND s.latitude IS NOT NULL 
        AND s.longitude IS NOT NULL
        AND (
            6371 * acos(
                cos(radians(target_lat)) * 
                cos(radians(s.latitude)) * 
                cos(radians(s.longitude) - radians(target_lng)) + 
                sin(radians(target_lat)) * 
                sin(radians(s.latitude))
            )
        ) <= s.delivery_radius_km
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_suppliers_in_radius(DECIMAL(10,8), DECIMAL(11,8), INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_delivers_to_location(UUID, DECIMAL(10,8), DECIMAL(11,8)) TO authenticated;
