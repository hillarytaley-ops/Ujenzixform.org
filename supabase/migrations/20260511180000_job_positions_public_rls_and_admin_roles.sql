-- Careers / job_positions: public site showed no listings when is_active was NULL, or when
-- only super_admin existed in user_roles (policy previously required role = 'admin' only).

-- Normalize legacy NULLs so public RLS and .eq('is_active', true) agree
UPDATE public.job_positions
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE public.job_positions
  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE public.job_positions
  ALTER COLUMN is_active SET NOT NULL;

-- Public read: treat NULL as visible (defensive; column is now NOT NULL)
DROP POLICY IF EXISTS "Anyone can view active job positions" ON public.job_positions;
CREATE POLICY "Anyone can view active job positions"
ON public.job_positions
FOR SELECT
USING (COALESCE(is_active, true) = true);

-- Admins: align with invoices / other tables (admin + super_admin in user_roles)
DROP POLICY IF EXISTS "Admins can manage job positions" ON public.job_positions;
CREATE POLICY "Admins can manage job positions"
ON public.job_positions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text IN ('admin', 'super_admin')
  )
);
