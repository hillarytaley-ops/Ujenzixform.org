-- Implement comprehensive security policies for delivery system
-- Migration: 20241212_delivery_security_policies.sql

-- Enable Row Level Security on all delivery tables
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_reviews ENABLE ROW LEVEL SECURITY;

-- DELIVERY PROVIDERS POLICIES
-- Providers can manage their own profile
CREATE POLICY "delivery_providers_self_access" ON public.delivery_providers
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Authenticated users can view active verified providers (for selection)
CREATE POLICY "delivery_providers_public_read" ON public.delivery_providers
    FOR SELECT TO authenticated
    USING (is_verified = true AND is_active = true);

-- Admins have full access to all providers
CREATE POLICY "delivery_providers_admin_all" ON public.delivery_providers
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

-- DELIVERIES POLICIES
-- Users can view deliveries they're involved in (builder, supplier, provider)
CREATE POLICY "deliveries_participant_access" ON public.deliveries
    FOR SELECT TO authenticated
    USING (
        builder_id = auth.uid() OR 
        supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
    );

-- Builders can create delivery requests
CREATE POLICY "deliveries_builder_create" ON public.deliveries
    FOR INSERT TO authenticated
    WITH CHECK (builder_id = auth.uid());

-- Providers can update delivery status and details
CREATE POLICY "deliveries_provider_update" ON public.deliveries
    FOR UPDATE TO authenticated
    USING (provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid()));

-- Admins have full access to all deliveries
CREATE POLICY "deliveries_admin_all" ON public.deliveries
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

-- DELIVERY TRACKING POLICIES
-- Only providers can insert tracking data for their deliveries
CREATE POLICY "delivery_tracking_provider_insert" ON public.delivery_tracking
    FOR INSERT TO authenticated
    WITH CHECK (
        provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
    );

-- Participants can view tracking data
CREATE POLICY "delivery_tracking_participant_read" ON public.delivery_tracking
    FOR SELECT TO authenticated
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE builder_id = auth.uid() 
            OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
            OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
        )
    );

-- Admins can view all tracking data
CREATE POLICY "delivery_tracking_admin_read" ON public.delivery_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- DELIVERY NOTIFICATIONS POLICIES
-- Users can view their own notifications
CREATE POLICY "delivery_notifications_recipient_read" ON public.delivery_notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "delivery_notifications_recipient_update" ON public.delivery_notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- System can create notifications for users
CREATE POLICY "delivery_notifications_system_create" ON public.delivery_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Will be restricted by application logic

-- Admins can manage all notifications
CREATE POLICY "delivery_notifications_admin_all" ON public.delivery_notifications
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

-- DELIVERY REVIEWS POLICIES
-- Users can read all reviews
CREATE POLICY "delivery_reviews_read_all" ON public.delivery_reviews
    FOR SELECT TO authenticated
    USING (true);

-- Users can only create reviews for their own deliveries
CREATE POLICY "delivery_reviews_create_own" ON public.delivery_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        reviewer_id = auth.uid() AND
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE builder_id = auth.uid() AND status = 'completed'
        )
    );

-- Users can update their own reviews
CREATE POLICY "delivery_reviews_update_own" ON public.delivery_reviews
    FOR UPDATE TO authenticated
    USING (reviewer_id = auth.uid())
    WITH CHECK (reviewer_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "delivery_reviews_delete_own" ON public.delivery_reviews
    FOR DELETE TO authenticated
    USING (reviewer_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "delivery_reviews_admin_all" ON public.delivery_reviews
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

-- Create function to update provider ratings when reviews change
CREATE OR REPLACE FUNCTION public.update_delivery_provider_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update provider aggregated ratings and metrics
    UPDATE public.delivery_providers 
    SET 
        rating = (
            SELECT ROUND(AVG(overall_rating)::numeric, 2) 
            FROM public.delivery_reviews 
            WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        ),
        customer_satisfaction = (
            SELECT ROUND(AVG(overall_rating)::numeric, 2) 
            FROM public.delivery_reviews 
            WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic rating updates
CREATE TRIGGER trigger_update_provider_ratings_insert
    AFTER INSERT ON public.delivery_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_delivery_provider_ratings();

CREATE TRIGGER trigger_update_provider_ratings_update
    AFTER UPDATE ON public.delivery_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_delivery_provider_ratings();

CREATE TRIGGER trigger_update_provider_ratings_delete
    AFTER DELETE ON public.delivery_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_delivery_provider_ratings();

-- Create function to update delivery metrics
CREATE OR REPLACE FUNCTION public.update_delivery_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update provider delivery metrics when delivery status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE public.delivery_providers 
        SET 
            total_deliveries = (
                SELECT COUNT(*) 
                FROM public.deliveries 
                WHERE provider_id = NEW.provider_id
            ),
            completed_deliveries = (
                SELECT COUNT(*) 
                FROM public.deliveries 
                WHERE provider_id = NEW.provider_id AND status = 'completed'
            ),
            on_time_delivery_rate = (
                SELECT ROUND(
                    (COUNT(*) FILTER (WHERE actual_delivery_time <= scheduled_delivery_time) * 100.0 / COUNT(*))::numeric, 2
                )
                FROM public.deliveries 
                WHERE provider_id = NEW.provider_id AND status = 'completed'
            ),
            average_delivery_time_hours = (
                SELECT ROUND(
                    AVG(EXTRACT(EPOCH FROM (actual_delivery_time - actual_pickup_time)) / 3600)::numeric, 2
                )
                FROM public.deliveries 
                WHERE provider_id = NEW.provider_id 
                AND status = 'completed' 
                AND actual_pickup_time IS NOT NULL 
                AND actual_delivery_time IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id = NEW.provider_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for delivery metrics updates
CREATE TRIGGER trigger_update_delivery_metrics
    AFTER UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.update_delivery_metrics();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_delivery_provider_ratings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_delivery_metrics() TO authenticated;
