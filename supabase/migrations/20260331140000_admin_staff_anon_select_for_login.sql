-- Admin login page uses the Supabase anon client (no JWT) to look up admin_staff by
-- email + staff_code. Later migrations (e.g. chat) restricted SELECT to authenticated
-- or is_online=true only, which breaks that flow — queries return no rows → "Invalid Credentials".
--
-- Restore a dedicated policy so anon (and authenticated) can read rows for verification.
-- This matches the original intent in 20251224_add_staff_code_column.sql.

DROP POLICY IF EXISTS "Allow public read for login verification" ON public.admin_staff;

CREATE POLICY "Allow public read for login verification"
ON public.admin_staff
FOR SELECT
TO anon, authenticated
USING (true);

-- Ensure primary bootstrap row has a staff_code if column exists (chat seed omitted it).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_staff' AND column_name = 'staff_code'
  ) THEN
    UPDATE public.admin_staff
    SET staff_code = COALESCE(NULLIF(TRIM(staff_code), ''), 'UJPRO-2024-0001')
    WHERE LOWER(email) = 'hillarytaley@gmail.com';
  END IF;
END $$;
