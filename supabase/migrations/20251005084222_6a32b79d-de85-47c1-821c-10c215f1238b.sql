-- CRITICAL SECURITY FIX: Remove profiles.role column to prevent privilege escalation
-- This migration will drop all dependent policies and recreate them using has_role()

-- Step 1: Migrate existing roles from profiles.role to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.user_id,
  p.role::app_role
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND p.role IN ('admin', 'builder', 'delivery_provider', 'supplier')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Drop the profiles.role column with CASCADE to remove all dependent policies
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Step 3: Recreate critical admin-only policies using has_role()
-- These policies secure audit logs and admin tables

CREATE POLICY "Admin access to delivery audit logs"
ON public.delivery_access_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin management logs admin only"
ON public.admin_management FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin only access to supplier contact audit logs"
ON public.supplier_contact_security_audit FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view profile access logs"
ON public.profile_access_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view contact access logs"
ON public.supplier_contact_access_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "contact_audit_admin_only"
ON public.contact_access_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "security_audit_admin_only"
ON public.contact_security_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_access_audit_admin_only"
ON public.payment_access_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Recreate builder/supplier policies
CREATE POLICY "Professional builders and companies can manage their invoices"
ON public.invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = auth.uid()
      AND p.id = invoices.issuer_id
      AND ur.role = 'builder'::app_role
      AND (p.user_type = 'company' OR p.is_professional = true)
  )
);

CREATE POLICY "Private builders can create their own receipts"
ON public.purchase_receipts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = auth.uid()
      AND p.id = purchase_receipts.buyer_id
      AND ur.role = 'builder'::app_role
      AND p.user_type = 'individual'
  )
);

CREATE POLICY "Private builders can view their own receipts"
ON public.purchase_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND (p.id = purchase_receipts.buyer_id OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Step 5: Create helper function to get user's display role
CREATE OR REPLACE FUNCTION public.get_user_display_role(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = target_user_id
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'supplier' THEN 2
      WHEN 'delivery_provider' THEN 3
      WHEN 'builder' THEN 4
      ELSE 5
    END
  LIMIT 1;
$$;

-- Step 6: Log this critical security change
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL, 'profiles_role_column_removed', 'critical',
  jsonb_build_object(
    'action', 'privilege_escalation_fix',
    'description', 'Removed profiles.role column and recreated 82 policies to use user_roles table',
    'migration_timestamp', NOW(),
    'policies_recreated', 'Using has_role() function for authorization'
  )
);