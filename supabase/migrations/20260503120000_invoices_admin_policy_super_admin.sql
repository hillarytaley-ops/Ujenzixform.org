-- Allow super_admin same full access on invoices as admin (purge / support tools use client DELETE).

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
      AND ur.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
  )
);
