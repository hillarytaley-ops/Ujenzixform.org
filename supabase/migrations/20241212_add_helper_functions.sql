-- Add helper functions for enhanced supplier functionality
-- Migration: 20241212_add_helper_functions.sql

-- Function to increment helpful votes on reviews
CREATE OR REPLACE FUNCTION public.increment_review_helpful_votes(review_id UUID)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER
AS $$
    UPDATE public.supplier_reviews 
    SET helpful_votes = COALESCE(helpful_votes, 0) + 1,
        updated_at = NOW()
    WHERE id = review_id;
$$;

-- Function to get top-rated suppliers by category
CREATE OR REPLACE FUNCTION public.get_top_suppliers_by_category(
    material_category TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    business_type TEXT,
    average_rating DECIMAL(3,2),
    total_reviews INTEGER,
    specialties TEXT[],
    materials_offered TEXT[],
    delivery_radius_km INTEGER,
    response_time_hours INTEGER,
    certifications TEXT[]
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.company_name,
        s.business_type,
        s.average_rating,
        s.total_reviews,
        s.specialties,
        s.materials_offered,
        s.delivery_radius_km,
        s.response_time_hours,
        s.certifications
    FROM public.suppliers s
    WHERE 
        s.is_verified = true
        AND s.operational_status = 'Active'
        AND s.total_reviews >= 5  -- Minimum reviews for reliability
        AND (material_category IS NULL OR material_category = ANY(s.materials_offered))
    ORDER BY 
        s.average_rating DESC, 
        s.total_reviews DESC,
        s.delivery_performance DESC
    LIMIT limit_count;
$$;

-- Function to get supplier performance summary
CREATE OR REPLACE FUNCTION public.get_supplier_performance_summary(supplier_uuid UUID)
RETURNS TABLE (
    supplier_id UUID,
    company_name TEXT,
    overall_score DECIMAL(3,2),
    performance_metrics JSONB,
    business_highlights JSONB,
    trust_indicators JSONB
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id as supplier_id,
        s.company_name,
        -- Calculate overall performance score
        ROUND(
            (COALESCE(s.average_rating, 0) * 0.3 +
             COALESCE(s.delivery_performance, 0) * 0.25 +
             COALESCE(s.order_accuracy_rate / 20.0, 0) * 0.25 +  -- Convert percentage to 5-point scale
             CASE WHEN s.response_time_hours <= 2 THEN 5.0
                  WHEN s.response_time_hours <= 6 THEN 4.0
                  WHEN s.response_time_hours <= 12 THEN 3.0
                  WHEN s.response_time_hours <= 24 THEN 2.0
                  ELSE 1.0 END * 0.2)::numeric, 2
        ) as overall_score,
        -- Performance metrics JSON
        jsonb_build_object(
            'average_rating', s.average_rating,
            'total_reviews', s.total_reviews,
            'recommendation_rate', s.recommendation_rate,
            'delivery_performance', s.delivery_performance,
            'order_accuracy_rate', s.order_accuracy_rate,
            'response_time_hours', s.response_time_hours
        ) as performance_metrics,
        -- Business highlights JSON
        jsonb_build_object(
            'business_type', s.business_type,
            'years_in_business', s.years_in_business,
            'employee_count', s.employee_count,
            'established_year', s.established_year,
            'annual_revenue_range', s.annual_revenue_range,
            'delivery_radius_km', s.delivery_radius_km,
            'lead_time_days', s.lead_time_days
        ) as business_highlights,
        -- Trust indicators JSON
        jsonb_build_object(
            'is_verified', s.is_verified,
            'business_registration', s.business_registration,
            'certifications', s.certifications,
            'quality_certifications', s.quality_certifications,
            'insurance_coverage', s.insurance_coverage,
            'warranty_offered', s.warranty_offered,
            'credit_terms_available', s.credit_terms_available
        ) as trust_indicators
    FROM public.suppliers s
    WHERE s.id = supplier_uuid;
$$;

-- Function to find similar suppliers
CREATE OR REPLACE FUNCTION public.find_similar_suppliers(
    supplier_uuid UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    company_name TEXT,
    business_type TEXT,
    average_rating DECIMAL(3,2),
    total_reviews INTEGER,
    similarity_score INTEGER
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    WITH base_supplier AS (
        SELECT * FROM public.suppliers WHERE id = supplier_uuid
    )
    SELECT 
        s.id,
        s.company_name,
        s.business_type,
        s.average_rating,
        s.total_reviews,
        -- Calculate similarity score
        (
            CASE WHEN s.business_type = bs.business_type THEN 30 ELSE 0 END +
            CASE WHEN s.specialties && bs.specialties THEN 25 ELSE 0 END +
            CASE WHEN s.materials_offered && bs.materials_offered THEN 20 ELSE 0 END +
            CASE WHEN s.county = bs.county THEN 15 ELSE 0 END +
            CASE WHEN ABS(s.average_rating - bs.average_rating) <= 0.5 THEN 10 ELSE 0 END
        ) as similarity_score
    FROM public.suppliers s
    CROSS JOIN base_supplier bs
    WHERE 
        s.id != supplier_uuid
        AND s.is_verified = true
        AND s.operational_status = 'Active'
        AND s.total_reviews >= 3
    ORDER BY similarity_score DESC, s.average_rating DESC
    LIMIT limit_count;
$$;

-- Function to get supplier business insights
CREATE OR REPLACE FUNCTION public.get_supplier_business_insights(supplier_uuid UUID)
RETURNS TABLE (
    supplier_id UUID,
    insights JSONB
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.id as supplier_id,
        jsonb_build_object(
            'market_position', 
                CASE 
                    WHEN s.average_rating >= 4.8 AND s.total_reviews >= 50 THEN 'Market Leader'
                    WHEN s.average_rating >= 4.5 AND s.total_reviews >= 20 THEN 'Top Performer'
                    WHEN s.average_rating >= 4.0 AND s.total_reviews >= 10 THEN 'Reliable Partner'
                    ELSE 'Emerging Supplier'
                END,
            'competitive_advantages', 
                ARRAY(
                    SELECT advantage FROM (
                        SELECT 'Fast Response' as advantage WHERE s.response_time_hours <= 2
                        UNION SELECT 'High Accuracy' WHERE s.order_accuracy_rate >= 95
                        UNION SELECT 'Wide Coverage' WHERE s.delivery_radius_km >= 100
                        UNION SELECT 'Bulk Discounts' WHERE s.bulk_discount_available = true
                        UNION SELECT 'Credit Terms' WHERE s.credit_terms_available = true
                        UNION SELECT 'Insurance Coverage' WHERE s.insurance_coverage = true
                        UNION SELECT 'Quality Certified' WHERE array_length(s.quality_certifications, 1) > 0
                        UNION SELECT 'Warranty Included' WHERE s.warranty_offered = true
                    ) advantages
                ),
            'business_maturity',
                CASE 
                    WHEN s.years_in_business >= 15 THEN 'Established'
                    WHEN s.years_in_business >= 8 THEN 'Experienced'
                    WHEN s.years_in_business >= 3 THEN 'Growing'
                    ELSE 'New Business'
                END,
            'capacity_level',
                CASE 
                    WHEN s.employee_count >= 200 THEN 'Large Scale'
                    WHEN s.employee_count >= 50 THEN 'Medium Scale'
                    WHEN s.employee_count >= 10 THEN 'Small Scale'
                    ELSE 'Micro Business'
                END
        ) as insights
    FROM public.suppliers s
    WHERE s.id = supplier_uuid;
$$;

-- Grant execute permissions for all new functions
GRANT EXECUTE ON FUNCTION public.increment_review_helpful_votes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_suppliers_by_category(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_performance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_suppliers(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_business_insights(UUID) TO authenticated;
