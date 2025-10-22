-- Add review aggregation fields to suppliers table
-- Migration: 20241212_add_supplier_aggregation_fields.sql

-- Add review aggregation columns to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS recommendation_rate DECIMAL(5,2) DEFAULT 0.00;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_suppliers_total_reviews ON public.suppliers(total_reviews);
CREATE INDEX IF NOT EXISTS idx_suppliers_average_rating ON public.suppliers(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_recommendation_rate ON public.suppliers(recommendation_rate DESC);

-- Update existing suppliers to calculate current ratings if any reviews exist
-- (This will be populated by the trigger function when reviews are added)

-- Create function to get supplier rating statistics
CREATE OR REPLACE FUNCTION public.get_supplier_rating_stats(supplier_uuid UUID)
RETURNS TABLE (
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    recommendation_rate DECIMAL(5,2),
    rating_distribution JSONB,
    detailed_ratings JSONB
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        s.total_reviews,
        s.average_rating,
        s.recommendation_rate,
        (
            SELECT jsonb_build_object(
                '5', COUNT(*) FILTER (WHERE rating = 5),
                '4', COUNT(*) FILTER (WHERE rating = 4),
                '3', COUNT(*) FILTER (WHERE rating = 3),
                '2', COUNT(*) FILTER (WHERE rating = 2),
                '1', COUNT(*) FILTER (WHERE rating = 1)
            )
            FROM public.supplier_reviews 
            WHERE supplier_id = supplier_uuid
        ) as rating_distribution,
        (
            SELECT jsonb_build_object(
                'product_quality', ROUND(AVG(product_quality_rating)::numeric, 2),
                'delivery', ROUND(AVG(delivery_rating)::numeric, 2),
                'customer_service', ROUND(AVG(customer_service_rating)::numeric, 2),
                'value_for_money', ROUND(AVG(value_for_money_rating)::numeric, 2),
                'order_accuracy', ROUND(AVG(order_accuracy_rating)::numeric, 2),
                'communication', ROUND(AVG(communication_rating)::numeric, 2)
            )
            FROM public.supplier_reviews 
            WHERE supplier_id = supplier_uuid
        ) as detailed_ratings
    FROM public.suppliers s
    WHERE s.id = supplier_uuid;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_supplier_rating_stats(UUID) TO authenticated;

-- Update the existing rating field to match average_rating for consistency
UPDATE public.suppliers 
SET rating = average_rating 
WHERE average_rating IS NOT NULL AND average_rating > 0;
