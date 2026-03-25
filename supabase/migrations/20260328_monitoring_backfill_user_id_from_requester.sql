-- Align user_id with requester_id for legacy rows so builder queries and RLS stay consistent.
-- Some rows only had requester_id set; the dashboard filtered by user_id and showed nothing.

DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitoring_service_requests'
      AND column_name = 'requester_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitoring_service_requests'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.monitoring_service_requests
    SET user_id = requester_id
    WHERE user_id IS NULL
      AND requester_id IS NOT NULL;
  END IF;
END $migrate$;
