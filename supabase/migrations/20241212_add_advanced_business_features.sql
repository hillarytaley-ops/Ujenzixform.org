-- Add advanced business features to suppliers table
-- Migration: 20241212_add_advanced_business_features.sql

-- Add advanced business columns
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30' CHECK (payment_terms IN ('Cash on Delivery', 'Net 7', 'Net 15', 'Net 30', 'Net 60', 'Advance Payment', 'Custom')),
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(12,2) DEFAULT 0.00 CHECK (minimum_order_value >= 0),
ADD COLUMN IF NOT EXISTS maximum_order_value DECIMAL(12,2) CHECK (maximum_order_value IS NULL OR maximum_order_value >= minimum_order_value),
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3 CHECK (lead_time_days >= 0),
ADD COLUMN IF NOT EXISTS bulk_discount_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_terms_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_coverage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quality_certifications TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add supplier capabilities
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS delivery_methods TEXT[] DEFAULT ARRAY['Standard Delivery']::TEXT[],
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['Cash', 'Bank Transfer']::TEXT[],
ADD COLUMN IF NOT EXISTS warranty_offered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_period_months INTEGER CHECK (warranty_period_months IS NULL OR warranty_period_months >= 0),
ADD COLUMN IF NOT EXISTS return_policy TEXT,
ADD COLUMN IF NOT EXISTS customer_support_hours TEXT DEFAULT 'Business Hours';

-- Add business metrics
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS monthly_capacity_tons DECIMAL(10,2) CHECK (monthly_capacity_tons IS NULL OR monthly_capacity_tons >= 0),
ADD COLUMN IF NOT EXISTS storage_capacity_m3 DECIMAL(10,2) CHECK (storage_capacity_m3 IS NULL OR storage_capacity_m3 >= 0),
ADD COLUMN IF NOT EXISTS fleet_size INTEGER CHECK (fleet_size IS NULL OR fleet_size >= 0),
ADD COLUMN IF NOT EXISTS established_year INTEGER CHECK (established_year IS NULL OR (established_year >= 1900 AND established_year <= EXTRACT(YEAR FROM NOW()))),
ADD COLUMN IF NOT EXISTS annual_revenue_range TEXT CHECK (annual_revenue_range IS NULL OR annual_revenue_range IN ('Under 1M', '1M-5M', '5M-10M', '10M-50M', '50M-100M', 'Over 100M'));

-- Create indexes for advanced features
CREATE INDEX IF NOT EXISTS idx_suppliers_certifications ON public.suppliers USING GIN(certifications);
CREATE INDEX IF NOT EXISTS idx_suppliers_payment_terms ON public.suppliers(payment_terms);
CREATE INDEX IF NOT EXISTS idx_suppliers_minimum_order ON public.suppliers(minimum_order_value);
CREATE INDEX IF NOT EXISTS idx_suppliers_lead_time ON public.suppliers(lead_time_days);
CREATE INDEX IF NOT EXISTS idx_suppliers_services ON public.suppliers USING GIN(services_offered);
CREATE INDEX IF NOT EXISTS idx_suppliers_delivery_methods ON public.suppliers USING GIN(delivery_methods);
CREATE INDEX IF NOT EXISTS idx_suppliers_established_year ON public.suppliers(established_year DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.suppliers.certifications IS 'Array of business certifications (ISO, quality standards, etc.)';
COMMENT ON COLUMN public.suppliers.payment_terms IS 'Standard payment terms offered';
COMMENT ON COLUMN public.suppliers.minimum_order_value IS 'Minimum order value in KES';
COMMENT ON COLUMN public.suppliers.maximum_order_value IS 'Maximum order value in KES (NULL for unlimited)';
COMMENT ON COLUMN public.suppliers.lead_time_days IS 'Standard lead time for orders in days';
COMMENT ON COLUMN public.suppliers.bulk_discount_available IS 'Whether bulk discounts are available';
COMMENT ON COLUMN public.suppliers.credit_terms_available IS 'Whether credit terms are offered';
COMMENT ON COLUMN public.suppliers.insurance_coverage IS 'Whether goods are insured during delivery';
COMMENT ON COLUMN public.suppliers.quality_certifications IS 'Array of quality certifications';
COMMENT ON COLUMN public.suppliers.services_offered IS 'Array of additional services offered';
COMMENT ON COLUMN public.suppliers.delivery_methods IS 'Array of available delivery methods';
COMMENT ON COLUMN public.suppliers.payment_methods IS 'Array of accepted payment methods';
COMMENT ON COLUMN public.suppliers.warranty_offered IS 'Whether warranty is offered on products';
COMMENT ON COLUMN public.suppliers.warranty_period_months IS 'Warranty period in months';
COMMENT ON COLUMN public.suppliers.return_policy IS 'Return policy description';
COMMENT ON COLUMN public.suppliers.customer_support_hours IS 'Customer support availability hours';
COMMENT ON COLUMN public.suppliers.monthly_capacity_tons IS 'Monthly production/supply capacity in tons';
COMMENT ON COLUMN public.suppliers.storage_capacity_m3 IS 'Storage capacity in cubic meters';
COMMENT ON COLUMN public.suppliers.fleet_size IS 'Number of delivery vehicles';
COMMENT ON COLUMN public.suppliers.established_year IS 'Year the business was established';
COMMENT ON COLUMN public.suppliers.annual_revenue_range IS 'Annual revenue range category';

-- Create function to get supplier capabilities summary
CREATE OR REPLACE FUNCTION public.get_supplier_capabilities(supplier_uuid UUID)
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    business_type TEXT,
    certifications TEXT[],
    services_offered TEXT[],
    delivery_methods TEXT[],
    payment_methods TEXT[],
    payment_terms TEXT,
    minimum_order_value DECIMAL(12,2),
    lead_time_days INTEGER,
    delivery_radius_km INTEGER,
    warranty_offered BOOLEAN,
    warranty_period_months INTEGER,
    bulk_discount_available BOOLEAN,
    credit_terms_available BOOLEAN,
    insurance_coverage BOOLEAN
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.company_name,
        s.business_type,
        s.certifications,
        s.services_offered,
        s.delivery_methods,
        s.payment_methods,
        s.payment_terms,
        s.minimum_order_value,
        s.lead_time_days,
        s.delivery_radius_km,
        s.warranty_offered,
        s.warranty_period_months,
        s.bulk_discount_available,
        s.credit_terms_available,
        s.insurance_coverage
    FROM public.suppliers s
    WHERE s.id = supplier_uuid
    AND s.is_verified = true
    AND s.operational_status = 'Active';
$$;

-- Create function to search suppliers by capabilities
CREATE OR REPLACE FUNCTION public.search_suppliers_by_capabilities(
    required_services TEXT[] DEFAULT ARRAY[]::TEXT[],
    required_certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
    max_lead_time INTEGER DEFAULT NULL,
    min_order_value DECIMAL(12,2) DEFAULT NULL,
    max_order_value DECIMAL(12,2) DEFAULT NULL,
    payment_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    business_type TEXT,
    average_rating DECIMAL(3,2),
    total_reviews INTEGER,
    lead_time_days INTEGER,
    minimum_order_value DECIMAL(12,2),
    payment_terms TEXT,
    delivery_radius_km INTEGER,
    match_score INTEGER
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.company_name,
        s.business_type,
        s.average_rating,
        s.total_reviews,
        s.lead_time_days,
        s.minimum_order_value,
        s.payment_terms,
        s.delivery_radius_km,
        -- Calculate match score based on criteria
        (
            CASE WHEN required_services <@ s.services_offered THEN 30 ELSE 0 END +
            CASE WHEN required_certifications <@ s.certifications THEN 25 ELSE 0 END +
            CASE WHEN max_lead_time IS NULL OR s.lead_time_days <= max_lead_time THEN 20 ELSE 0 END +
            CASE WHEN min_order_value IS NULL OR s.minimum_order_value <= min_order_value THEN 15 ELSE 0 END +
            CASE WHEN payment_term IS NULL OR s.payment_terms = payment_term THEN 10 ELSE 0 END
        ) as match_score
    FROM public.suppliers s
    WHERE 
        s.is_verified = true
        AND s.operational_status = 'Active'
        AND (required_services = ARRAY[]::TEXT[] OR required_services <@ s.services_offered)
        AND (required_certifications = ARRAY[]::TEXT[] OR required_certifications <@ s.certifications)
        AND (max_lead_time IS NULL OR s.lead_time_days <= max_lead_time)
        AND (min_order_value IS NULL OR s.minimum_order_value <= min_order_value)
        AND (max_order_value IS NULL OR s.minimum_order_value <= max_order_value)
        AND (payment_term IS NULL OR s.payment_terms = payment_term)
    ORDER BY match_score DESC, s.average_rating DESC, s.total_reviews DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_supplier_capabilities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_suppliers_by_capabilities(TEXT[], TEXT[], INTEGER, DECIMAL(12,2), DECIMAL(12,2), TEXT) TO authenticated;
