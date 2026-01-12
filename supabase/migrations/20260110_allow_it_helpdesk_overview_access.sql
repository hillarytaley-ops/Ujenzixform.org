-- =============================================
-- Allow IT Helpdesk Staff to Read Overview Stats
-- This migration grants IT helpdesk staff read access to
-- overview statistics needed for the admin dashboard
-- =============================================

-- Helper function to check if user is IT helpdesk staff
-- Checks admin_staff table for role = 'it_helpdesk'
CREATE OR REPLACE FUNCTION public.is_it_helpdesk()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_staff
    WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
    )
    AND role = 'it_helpdesk'
    AND status = 'active'
  );
$$;

-- Helper function to check if user is any admin staff (super_admin, admin, or it_helpdesk)
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_staff
    WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
    )
    AND role IN ('super_admin', 'admin', 'it_helpdesk', 'logistics_officer', 'registrations_officer', 'finance_officer', 'monitoring_officer', 'customer_support', 'moderator')
    AND status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- RLS Policies for Overview Stats
-- IT Helpdesk can read counts for dashboard overview
-- =============================================

-- Allow IT Helpdesk to read user_roles (for counts only)
-- Check if policy already exists to avoid conflicts
DO $$
BEGIN
  -- Drop existing permissive policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'it_helpdesk_can_read_user_roles'
  ) THEN
    DROP POLICY "it_helpdesk_can_read_user_roles" ON user_roles;
  END IF;
  
  -- Create policy for IT helpdesk to read user_roles (for counts)
  CREATE POLICY "it_helpdesk_can_read_user_roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (
      is_admin()
      OR is_it_helpdesk()
    );
END $$;

-- Allow IT Helpdesk to read supplier_applications (for pending count)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'supplier_applications' 
    AND policyname = 'it_helpdesk_can_read_supplier_applications'
  ) THEN
    DROP POLICY "it_helpdesk_can_read_supplier_applications" ON supplier_applications;
  END IF;
  
  CREATE POLICY "it_helpdesk_can_read_supplier_applications"
    ON supplier_applications FOR SELECT
    TO authenticated
    USING (
      is_admin()
      OR is_it_helpdesk()
      -- Suppliers can see their own applications
      OR EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = supplier_applications.id
        AND s.user_id = auth.uid()
      )
    );
END $$;

-- Allow IT Helpdesk to read delivery_providers (for pending count)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'delivery_providers' 
    AND policyname = 'it_helpdesk_can_read_delivery_providers'
  ) THEN
    DROP POLICY "it_helpdesk_can_read_delivery_providers" ON delivery_providers;
  END IF;
  
  CREATE POLICY "it_helpdesk_can_read_delivery_providers"
    ON delivery_providers FOR SELECT
    TO authenticated
    USING (
      is_admin()
      OR is_it_helpdesk()
      -- Delivery providers can see their own data
      OR user_id = auth.uid()
    );
END $$;

-- Allow IT Helpdesk to read feedback (for counts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback' 
    AND policyname = 'it_helpdesk_can_read_feedback'
  ) THEN
    DROP POLICY "it_helpdesk_can_read_feedback" ON feedback;
  END IF;
  
  CREATE POLICY "it_helpdesk_can_read_feedback"
    ON feedback FOR SELECT
    TO authenticated
    USING (
      is_admin()
      OR is_it_helpdesk()
      -- Users can see their own feedback
      OR user_id = auth.uid()
    );
END $$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_it_helpdesk() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_staff() TO authenticated;

-- Success message
SELECT 
  '✅ IT Helpdesk overview access policies created!' as status,
  'IT helpdesk staff can now read overview statistics for dashboard' as description;

