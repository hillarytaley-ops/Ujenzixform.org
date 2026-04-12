-- =============================================================================
-- Supabase database linter (security): 0011, 0014, 0024
-- - function_search_path_mutable: haversine_km, audit_sensitive_contact_access
-- - extension_in_public: pg_net → extensions schema (when movable)
-- - rls_policy_always_true: admin_security_logs authenticated INSERT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) haversine_km — immutable search_path (linter 0011)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(
    (6371 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
        sin(radians(lat1)) * sin(radians(lat2))
      ))
    ))::numeric,
    2
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) audit_sensitive_contact_access — search_path + qualified refs (0011)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_sensitive_contact_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  SELECT p.role INTO current_user_role
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    format('%s_contact_access', TG_TABLE_NAME),
    CASE
      WHEN current_user_role = 'admin' OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'low'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'user_role', current_user_role,
      'access_authorized', (current_user_role = 'admin' OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id)),
      'timestamp', NOW()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) pg_net — not in public schema (0014)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_net'
      AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_net schema move skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 4) admin_security_logs — authenticated INSERT not WITH CHECK (true) (0024)
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_security_logs ADD COLUMN IF NOT EXISTS email TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_security_logs' AND column_name = 'email_attempt'
  ) THEN
    UPDATE public.admin_security_logs
    SET email = COALESCE(email, email_attempt)
    WHERE email IS NULL AND email_attempt IS NOT NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "admin_security_logs_insert_authenticated" ON public.admin_security_logs;

CREATE POLICY "admin_security_logs_insert_authenticated"
ON public.admin_security_logs FOR INSERT
TO authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND trim(event_type) <> ''
  AND char_length(event_type) <= 128
  AND (email IS NULL OR char_length(email) <= 320)
  AND (details IS NULL OR char_length(details) <= 12000)
  AND (ip_address IS NULL OR char_length(ip_address) <= 256)
  AND (user_agent IS NULL OR char_length(user_agent) <= 2000)
);
