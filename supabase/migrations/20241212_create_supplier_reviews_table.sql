-- Create supplier_reviews table for comprehensive rating system
-- Migration: 20241212_create_supplier_reviews_table.sql

-- Create supplier_reviews table
CREATE TABLE IF NOT EXISTS public.supplier_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Overall rating (1-5 scale)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- Detailed ratings (1-5 scale each)
    product_quality_rating INTEGER CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    customer_service_rating INTEGER CHECK (customer_service_rating >= 1 AND customer_service_rating <= 5),
    value_for_money_rating INTEGER CHECK (value_for_money_rating >= 1 AND value_for_money_rating <= 5),
    order_accuracy_rating INTEGER CHECK (order_accuracy_rating >= 1 AND order_accuracy_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    -- Review content
    comment TEXT NOT NULL,
    product_category TEXT,
    order_value TEXT,
    delivery_time TEXT,
    
    -- Verification and recommendation
    verified_purchase BOOLEAN DEFAULT false,
    would_recommend BOOLEAN DEFAULT true,
    helpful_votes INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_supplier_reviewer UNIQUE(supplier_id, reviewer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier_id ON public.supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_reviewer_id ON public.supplier_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_rating ON public.supplier_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_created_at ON public.supplier_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_verified ON public.supplier_reviews(verified_purchase);

-- Enable Row Level Security
ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_reviews
-- Users can read all reviews
CREATE POLICY "supplier_reviews_read_all" ON public.supplier_reviews
    FOR SELECT TO authenticated
    USING (true);

-- Users can only insert their own reviews
CREATE POLICY "supplier_reviews_insert_own" ON public.supplier_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can only update their own reviews
CREATE POLICY "supplier_reviews_update_own" ON public.supplier_reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can only delete their own reviews
CREATE POLICY "supplier_reviews_delete_own" ON public.supplier_reviews
    FOR DELETE TO authenticated
    USING (auth.uid() = reviewer_id);

-- Admins can manage all reviews
CREATE POLICY "supplier_reviews_admin_all" ON public.supplier_reviews
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- Create function to update supplier ratings when reviews change
CREATE OR REPLACE FUNCTION public.update_supplier_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update supplier aggregated ratings
    UPDATE public.suppliers 
    SET 
        total_reviews = (
            SELECT COUNT(*) 
            FROM public.supplier_reviews 
            WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
        ),
        average_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2) 
            FROM public.supplier_reviews 
            WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
        ),
        recommendation_rate = (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE would_recommend = true) * 100.0 / COUNT(*))::numeric, 2
            )
            FROM public.supplier_reviews 
            WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update supplier ratings
CREATE TRIGGER trigger_update_supplier_ratings_insert
    AFTER INSERT ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_ratings();

CREATE TRIGGER trigger_update_supplier_ratings_update
    AFTER UPDATE ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_ratings();

CREATE TRIGGER trigger_update_supplier_ratings_delete
    AFTER DELETE ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_ratings();

-- Create function to get supplier reviews with user details
CREATE OR REPLACE FUNCTION public.get_supplier_reviews(supplier_uuid UUID)
RETURNS TABLE (
    id UUID,
    rating INTEGER,
    product_quality_rating INTEGER,
    delivery_rating INTEGER,
    customer_service_rating INTEGER,
    value_for_money_rating INTEGER,
    order_accuracy_rating INTEGER,
    communication_rating INTEGER,
    comment TEXT,
    product_category TEXT,
    order_value TEXT,
    delivery_time TEXT,
    verified_purchase BOOLEAN,
    would_recommend BOOLEAN,
    helpful_votes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    reviewer_name TEXT,
    reviewer_company TEXT
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        sr.id,
        sr.rating,
        sr.product_quality_rating,
        sr.delivery_rating,
        sr.customer_service_rating,
        sr.value_for_money_rating,
        sr.order_accuracy_rating,
        sr.communication_rating,
        sr.comment,
        sr.product_category,
        sr.order_value,
        sr.delivery_time,
        sr.verified_purchase,
        sr.would_recommend,
        sr.helpful_votes,
        sr.created_at,
        COALESCE(p.full_name, 'Anonymous') as reviewer_name,
        p.company_name as reviewer_company
    FROM public.supplier_reviews sr
    LEFT JOIN public.profiles p ON p.user_id = sr.reviewer_id
    WHERE sr.supplier_id = supplier_uuid
    ORDER BY sr.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_supplier_reviews(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_supplier_ratings() TO authenticated;
