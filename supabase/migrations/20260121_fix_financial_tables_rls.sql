-- Fix RLS policies for delivery_orders and quotation_requests tables
-- to allow admin access via user_roles table
-- NOTE: profiles table does NOT have a 'role' column - only user_roles does

-- ============================================================================
-- DELIVERY_ORDERS TABLE - Fix admin access
-- ============================================================================

-- Drop existing policies that may be blocking admin access
DROP POLICY IF EXISTS "Users can view their own delivery orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_admin_access" ON public.delivery_orders;
DROP POLICY IF EXISTS "Admin full access to delivery_orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_admin_full_access" ON public.delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_user_select" ON public.delivery_orders;

-- Ensure RLS is enabled
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Create admin access policy (only checks user_roles table)
CREATE POLICY "delivery_orders_admin_full_access" ON public.delivery_orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Users can view their own delivery orders (builder or supplier)
CREATE POLICY "delivery_orders_user_select" ON public.delivery_orders
FOR SELECT TO authenticated
USING (
    builder_id = auth.uid() OR
    supplier_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND (id = delivery_orders.builder_id OR id = delivery_orders.supplier_id)
    )
);

-- ============================================================================
-- QUOTATION_REQUESTS TABLE - Fix admin access
-- ============================================================================

-- Drop existing policies that may be blocking admin access
DROP POLICY IF EXISTS "quotation_requests_admin_access" ON public.quotation_requests;
DROP POLICY IF EXISTS "Admin full access to quotation_requests" ON public.quotation_requests;
DROP POLICY IF EXISTS "Users can view their own quotation requests" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotation_requests_admin_full_access" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotation_requests_user_select" ON public.quotation_requests;

-- Ensure RLS is enabled
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;

-- Create admin access policy (only checks user_roles table)
CREATE POLICY "quotation_requests_admin_full_access" ON public.quotation_requests
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Users can view their own quotation requests (requester or supplier)
CREATE POLICY "quotation_requests_user_select" ON public.quotation_requests
FOR SELECT TO authenticated
USING (
    requester_id = auth.uid() OR
    supplier_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND (id = quotation_requests.requester_id OR id = quotation_requests.supplier_id)
    )
);

-- ============================================================================
-- INVOICES TABLE - Ensure admin access
-- ============================================================================

DROP POLICY IF EXISTS "invoices_admin_access" ON public.invoices;
DROP POLICY IF EXISTS "invoices_admin_full_access" ON public.invoices;

-- Create admin access policy for invoices
CREATE POLICY "invoices_admin_full_access" ON public.invoices
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================================================
-- PAYMENTS TABLE - Ensure admin access
-- ============================================================================

DROP POLICY IF EXISTS "payments_admin_access" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_full_access" ON public.payments;

-- Create admin access policy for payments
CREATE POLICY "payments_admin_full_access" ON public.payments
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================================================
-- PURCHASE_RECEIPTS TABLE - Ensure admin access
-- ============================================================================

DROP POLICY IF EXISTS "purchase_receipts_admin_access" ON public.purchase_receipts;
DROP POLICY IF EXISTS "purchase_receipts_admin_full_access" ON public.purchase_receipts;

-- Create admin access policy for purchase_receipts
CREATE POLICY "purchase_receipts_admin_full_access" ON public.purchase_receipts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- ============================================================================
-- PURCHASE_ORDERS TABLE - Ensure admin access
-- ============================================================================

DROP POLICY IF EXISTS "purchase_orders_admin_all" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_access" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_full_access" ON public.purchase_orders;

-- Create admin access policy for purchase_orders
CREATE POLICY "purchase_orders_admin_full_access" ON public.purchase_orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.delivery_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quotation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.purchase_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;

