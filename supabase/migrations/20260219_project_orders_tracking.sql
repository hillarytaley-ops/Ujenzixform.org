-- ============================================================
-- Project Orders & Spending Tracking
-- Links purchase orders, deliveries, and monitoring to projects
-- Created: February 19, 2026
-- ============================================================

-- Add project_id to purchase_orders if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'project_id') THEN
        ALTER TABLE purchase_orders ADD COLUMN project_id UUID REFERENCES builder_projects(id) ON DELETE SET NULL;
        CREATE INDEX idx_purchase_orders_project ON purchase_orders(project_id);
    END IF;
END $$;

-- Add project_id to delivery_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_requests' AND column_name = 'project_id') THEN
        ALTER TABLE delivery_requests ADD COLUMN project_id UUID REFERENCES builder_projects(id) ON DELETE SET NULL;
        CREATE INDEX idx_delivery_requests_project ON delivery_requests(project_id);
    END IF;
END $$;

-- Add project_id to monitoring_service_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'monitoring_service_requests' AND column_name = 'project_id') THEN
        ALTER TABLE monitoring_service_requests ADD COLUMN project_id UUID REFERENCES builder_projects(id) ON DELETE SET NULL;
        CREATE INDEX idx_monitoring_requests_project ON monitoring_service_requests(project_id);
    END IF;
END $$;

-- Add more columns to builder_projects for tracking
DO $$ 
BEGIN
    -- Total materials cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'materials_spent') THEN
        ALTER TABLE builder_projects ADD COLUMN materials_spent NUMERIC(15, 2) DEFAULT 0;
    END IF;
    
    -- Total delivery cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'delivery_spent') THEN
        ALTER TABLE builder_projects ADD COLUMN delivery_spent NUMERIC(15, 2) DEFAULT 0;
    END IF;
    
    -- Total monitoring cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'monitoring_spent') THEN
        ALTER TABLE builder_projects ADD COLUMN monitoring_spent NUMERIC(15, 2) DEFAULT 0;
    END IF;
    
    -- Project type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'project_type') THEN
        ALTER TABLE builder_projects ADD COLUMN project_type TEXT DEFAULT 'residential';
    END IF;
    
    -- Client name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'client_name') THEN
        ALTER TABLE builder_projects ADD COLUMN client_name TEXT;
    END IF;
    
    -- Progress percentage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'progress') THEN
        ALTER TABLE builder_projects ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
    END IF;
    
    -- Expected end date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'expected_end_date') THEN
        ALTER TABLE builder_projects ADD COLUMN expected_end_date DATE;
    END IF;
    
    -- Number of orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'builder_projects' AND column_name = 'total_orders') THEN
        ALTER TABLE builder_projects ADD COLUMN total_orders INTEGER DEFAULT 0;
    END IF;
END $$;

-- Function to update project spending when orders are added/updated
CREATE OR REPLACE FUNCTION update_project_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_materials_total NUMERIC(15, 2);
    v_delivery_total NUMERIC(15, 2);
    v_order_count INTEGER;
BEGIN
    -- Only process if project_id is set
    IF NEW.project_id IS NOT NULL THEN
        -- Calculate total materials cost for the project
        SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
        INTO v_materials_total, v_order_count
        FROM purchase_orders
        WHERE project_id = NEW.project_id
        AND status IN ('confirmed', 'dispatched', 'in_transit', 'delivered');
        
        -- Calculate total delivery cost for the project
        SELECT COALESCE(SUM(COALESCE(estimated_cost, 0)), 0)
        INTO v_delivery_total
        FROM delivery_requests
        WHERE project_id = NEW.project_id
        AND status IN ('accepted', 'in_transit', 'delivered', 'completed');
        
        -- Update project totals
        UPDATE builder_projects
        SET 
            materials_spent = v_materials_total,
            delivery_spent = v_delivery_total,
            spent = v_materials_total + v_delivery_total + COALESCE(monitoring_spent, 0),
            total_orders = v_order_count,
            updated_at = NOW()
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for purchase_orders
DROP TRIGGER IF EXISTS trg_update_project_spending_orders ON purchase_orders;
CREATE TRIGGER trg_update_project_spending_orders
    AFTER INSERT OR UPDATE OF total_amount, status, project_id ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending();

-- Function to update project spending from delivery requests
CREATE OR REPLACE FUNCTION update_project_spending_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_delivery_total NUMERIC(15, 2);
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        SELECT COALESCE(SUM(COALESCE(estimated_cost, 0)), 0)
        INTO v_delivery_total
        FROM delivery_requests
        WHERE project_id = NEW.project_id
        AND status IN ('accepted', 'in_transit', 'delivered', 'completed');
        
        UPDATE builder_projects
        SET 
            delivery_spent = v_delivery_total,
            spent = COALESCE(materials_spent, 0) + v_delivery_total + COALESCE(monitoring_spent, 0),
            updated_at = NOW()
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for delivery_requests
DROP TRIGGER IF EXISTS trg_update_project_spending_delivery ON delivery_requests;
CREATE TRIGGER trg_update_project_spending_delivery
    AFTER INSERT OR UPDATE OF estimated_cost, status, project_id ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending_delivery();

-- Function to update project spending from monitoring requests
CREATE OR REPLACE FUNCTION update_project_spending_monitoring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_monitoring_total NUMERIC(15, 2);
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        -- Calculate monitoring cost (assuming a fixed rate per camera per month)
        SELECT COALESCE(SUM(COALESCE(camera_count, 1) * 5000), 0) -- KES 5000 per camera
        INTO v_monitoring_total
        FROM monitoring_service_requests
        WHERE project_id = NEW.project_id
        AND status IN ('approved', 'active', 'completed');
        
        UPDATE builder_projects
        SET 
            monitoring_spent = v_monitoring_total,
            spent = COALESCE(materials_spent, 0) + COALESCE(delivery_spent, 0) + v_monitoring_total,
            updated_at = NOW()
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for monitoring_service_requests
DROP TRIGGER IF EXISTS trg_update_project_spending_monitoring ON monitoring_service_requests;
CREATE TRIGGER trg_update_project_spending_monitoring
    AFTER INSERT OR UPDATE OF camera_count, status, project_id ON monitoring_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spending_monitoring();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON builder_projects TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
