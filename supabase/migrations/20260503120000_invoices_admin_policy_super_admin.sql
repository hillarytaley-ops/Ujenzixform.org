-- Allow staff with admin-like roles full access on invoices (purge / support tools use client DELETE).
-- Use role::text so we never cast a literal to app_role (enum may not include super_admin, etc.).

DROP POLICY IF EXISTS "invoices_admin_full_access" ON public.invoices;

CREATE POLICY "invoices_admin_full_access"
ON public.invoices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'super_admin')
  )
);
