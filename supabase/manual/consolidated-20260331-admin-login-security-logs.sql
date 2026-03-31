-- =============================================================================
-- CONSOLIDATED (hosted / one-shot): Admin staff login RPC + security log policies
-- =============================================================================
-- Equivalent to applying these migrations in order:
--   20260331120000_tighten_anon_insert_security_logs.sql
--   20260331150000_verify_admin_staff_login_rpc.sql
--   20260331160000_verify_admin_staff_login_rpc_v2.sql
-- (20260331140000 is superseded: it temporarily restored broad anon SELECT; the
--  RPC-based flow below drops that policy and does not re-add it.)
--
-- Use: Supabase Dashboard → SQL Editor → paste → Run
--      Or: psql / supabase db execute (if you wire it to the hosted DB)
--
-- Safe to re-run: uses DROP IF EXISTS / CREATE OR REPLACE where appropriate.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- [1] Tighten anon INSERT on security logging tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_security_logs_insert_all" ON public.admin_security_logs;
DROP POLICY IF EXISTS "admin_security_logs_insert" ON public.admin_security_logs;

CREATE POLICY "admin_security_logs_insert_authenticated"
ON public.admin_security_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_security_logs_insert_anon"
ON public.admin_security_logs FOR INSERT
TO anon
WITH CHECK (
  event_type IN (
    'staff_login',
    'login_attempt',
    'login_failed',
    'account_locked',
    'security_event'
  )
  AND (email IS NULL OR char_length(email) <= 320)
  AND (details IS NULL OR char_length(details::text) <= 12000)
);

DROP POLICY IF EXISTS "security_events_insert_all" ON public.security_events;
DROP POLICY IF EXISTS "security_events_insert" ON public.security_events;

CREATE POLICY "security_events_insert_authenticated"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
  OR (user_id IS NULL AND public.is_admin())
);

CREATE POLICY "security_events_insert_anon"
ON public.security_events FOR INSERT
TO anon
WITH CHECK (
  severity IN ('low', 'medium', 'high', 'critical')
  AND event_type IS NOT NULL
  AND char_length(event_type::text) <= 128
  AND (details IS NULL OR pg_column_size(details) <= 20000)
);

-- ---------------------------------------------------------------------------
-- [2] verify_admin_staff_login RPC (SECURITY DEFINER) — v2 body + grants
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.admin_staff ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.admin_staff ADD COLUMN IF NOT EXISTS staff_code_hash TEXT;
ALTER TABLE public.admin_staff ADD COLUMN IF NOT EXISTS last_login timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_staff' AND column_name = 'name'
  ) THEN
    UPDATE public.admin_staff s
    SET full_name = COALESCE(NULLIF(TRIM(s.full_name), ''), NULLIF(TRIM(s.name), ''), 'Staff Member')
    WHERE s.full_name IS NULL OR TRIM(s.full_name) = '';
  ELSE
    UPDATE public.admin_staff s
    SET full_name = COALESCE(NULLIF(TRIM(s.full_name), ''), 'Staff Member')
    WHERE s.full_name IS NULL OR TRIM(s.full_name) = '';
  END IF;
END $$;

-- Optional bootstrap (from 20260331140000): ensure primary row has staff_code if column exists
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

DROP POLICY IF EXISTS "Allow public read for login verification" ON public.admin_staff;

CREATE OR REPLACE FUNCTION public.verify_admin_staff_login(p_email text, p_staff_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_role text;
  v_disp text;
  v_staff_code text;
  v_staff_code_hash text;
  v_status text;
  v_hash text;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0
     OR p_staff_code IS NULL OR length(trim(p_staff_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_hash := encode(
    extensions.digest(convert_to(upper(trim(p_staff_code)), 'UTF8'), 'sha256'),
    'hex'
  );

  SELECT
    s.id,
    s.role::text,
    COALESCE(NULLIF(TRIM(s.full_name), ''), 'Staff Member'),
    s.staff_code,
    s.staff_code_hash,
    s.status
  INTO v_id, v_role, v_disp, v_staff_code, v_staff_code_hash, v_status
  FROM public.admin_staff s
  WHERE lower(trim(s.email)) = lower(trim(p_email))
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF COALESCE(v_status, 'active') IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
  END IF;

  IF COALESCE(NULLIF(TRIM(v_staff_code_hash), ''), '') <> '' THEN
    IF lower(trim(v_staff_code_hash)) IS DISTINCT FROM lower(v_hash) THEN
      IF COALESCE(NULLIF(TRIM(v_staff_code), ''), '') = ''
         OR upper(trim(v_staff_code)) IS DISTINCT FROM upper(trim(p_staff_code)) THEN
        RETURN jsonb_build_object('ok', false);
      END IF;
    END IF;
  ELSIF COALESCE(NULLIF(TRIM(v_staff_code), ''), '') <> '' THEN
    IF upper(trim(v_staff_code)) IS DISTINCT FROM upper(trim(p_staff_code)) THEN
      RETURN jsonb_build_object('ok', false);
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false);
  END IF;

  UPDATE public.admin_staff SET last_login = now() WHERE id = v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'role', COALESCE(v_role, 'admin'),
    'full_name', v_disp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_staff_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_staff_login(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.verify_admin_staff_login(text, text) IS
  'Staff portal login: verifies email + code (plaintext or staff_code_hash). Avoids listing all admin_staff rows to anon.';
