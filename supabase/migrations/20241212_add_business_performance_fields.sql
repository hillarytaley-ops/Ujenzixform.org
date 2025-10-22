-- Add business performance fields to suppliers table
-- Migration: 20241212_add_business_performance_fields.sql

-- Add business performance columns
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS delivery_performance DECIMAL(3,2) DEFAULT 0.00 CHECK (delivery_performance >= 0 AND delivery_performance <= 5.00),
ADD COLUMN IF NOT EXISTS order_accuracy_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (order_accuracy_rate >= 0 AND order_accuracy_rate <= 100.00),
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24 CHECK (response_time_hours >= 0),
ADD COLUMN IF NOT EXISTS business_registration TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Supplier' CHECK (business_type IN ('Manufacturer', 'Distributor', 'Retailer', 'Supplier', 'Wholesaler')),
ADD COLUMN IF NOT EXISTS years_in_business INTEGER CHECK (years_in_business >= 0),
ADD COLUMN IF NOT EXISTS employee_count INTEGER CHECK (employee_count >= 0);

-- Create indexes for performance fields
CREATE INDEX IF NOT EXISTS idx_suppliers_delivery_performance ON public.suppliers(delivery_performance DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_order_accuracy ON public.suppliers(order_accuracy_rate DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_response_time ON public.suppliers(response_time_hours ASC);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_type ON public.suppliers(business_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_years_in_business ON public.suppliers(years_in_business DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.suppliers.delivery_performance IS 'Average delivery performance rating (1-5 scale)';
COMMENT ON COLUMN public.suppliers.order_accuracy_rate IS 'Percentage of orders delivered accurately (0-100%)';
COMMENT ON COLUMN public.suppliers.response_time_hours IS 'Average response time to inquiries in hours';
COMMENT ON COLUMN public.suppliers.business_registration IS 'Business registration number or license';
COMMENT ON COLUMN public.suppliers.business_type IS 'Type of business: Manufacturer, Distributor, Retailer, Supplier, Wholesaler';
COMMENT ON COLUMN public.suppliers.years_in_business IS 'Number of years the business has been operating';
COMMENT ON COLUMN public.suppliers.employee_count IS 'Number of employees in the company';

-- Create function to update business performance metrics from reviews
CREATE OR REPLACE FUNCTION public.update_supplier_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update supplier performance metrics based on reviews
    UPDATE public.suppliers 
    SET 
        delivery_performance = (
            SELECT ROUND(AVG(delivery_rating)::numeric, 2) 
            FROM public.supplier_reviews 
            WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
            AND delivery_rating IS NOT NULL
        ),
        order_accuracy_rate = (
            SELECT ROUND(AVG(order_accuracy_rating * 20.0)::numeric, 2) -- Convert 1-5 scale to 0-100%
            FROM public.supplier_reviews 
            WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
            AND order_accuracy_rating IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for performance metrics
CREATE TRIGGER trigger_update_supplier_performance_insert
    AFTER INSERT ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_performance_metrics();

CREATE TRIGGER trigger_update_supplier_performance_update
    AFTER UPDATE ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_performance_metrics();

CREATE TRIGGER trigger_update_supplier_performance_delete
    AFTER DELETE ON public.supplier_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_supplier_performance_metrics();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_supplier_performance_metrics() TO authenticated;
