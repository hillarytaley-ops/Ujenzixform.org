-- Allow admin / finance staff to read invoice PDFs and delivery-note files in Storage (for admin dashboard downloads).
-- Buckets may already exist from the dashboard; policies are idempotent by name.

INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-notes', 'delivery-notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff read all invoice storage objects" ON storage.objects;
CREATE POLICY "Staff read all invoice storage objects"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text IN ('admin', 'super_admin', 'finance_officer')
  )
);

DROP POLICY IF EXISTS "Staff read all delivery-notes storage objects" ON storage.objects;
CREATE POLICY "Staff read all delivery-notes storage objects"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'delivery-notes'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text IN ('admin', 'super_admin', 'finance_officer')
  )
);
