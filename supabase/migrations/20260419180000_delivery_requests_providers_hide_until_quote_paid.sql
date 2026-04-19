-- Delivery providers must NOT see admin-quote jobs until Paystack payment (delivery_quote_paid).
-- Remove quoted / quote_accepted from the shared "open to all providers" branch.

DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  status IN (
    'pending',
    'requested',
    'assigned',
    'delivery_quote_paid'
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "delivery_requests_provider_update" ON public.delivery_requests
FOR UPDATE TO authenticated
USING (
  status IN (
    'pending',
    'requested',
    'assigned',
    'delivery_quote_paid'
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests IS
  'Providers see pending/requested/assigned and paid-quote jobs (delivery_quote_paid), not quoted/quote_accepted.';
