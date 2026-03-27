-- analytics_events: stop open anon/authenticated INSERT (WITH CHECK true).
-- Inserts must set user_id = auth.uid() so rows are attributable and RLS-bound.

REVOKE INSERT ON public.analytics_events FROM anon;

DROP POLICY IF EXISTS "analytics_events_insert" ON public.analytics_events;

CREATE POLICY "analytics_events_insert_own_user"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- SELECT unchanged: analytics_events_view_own (users see own rows).
