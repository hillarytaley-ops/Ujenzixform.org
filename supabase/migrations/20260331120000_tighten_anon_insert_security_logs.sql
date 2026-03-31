-- Tighten anon INSERT on security logging tables (abuse / log flooding).
-- Replaces broad policies from earlier migrations while preserving authenticated rules.

-- ---------------------------------------------------------------------------
-- admin_security_logs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_security_logs_insert_all" ON public.admin_security_logs;
DROP POLICY IF EXISTS "admin_security_logs_insert" ON public.admin_security_logs;
DROP POLICY IF EXISTS "admin_security_logs_insert_authenticated" ON public.admin_security_logs;
DROP POLICY IF EXISTS "admin_security_logs_insert_anon" ON public.admin_security_logs;

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

-- ---------------------------------------------------------------------------
-- security_events (keep authenticated checks from 20260110 phase3)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "security_events_insert_all" ON public.security_events;
DROP POLICY IF EXISTS "security_events_insert" ON public.security_events;
DROP POLICY IF EXISTS "security_events_insert_authenticated" ON public.security_events;
DROP POLICY IF EXISTS "security_events_insert_anon" ON public.security_events;

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
