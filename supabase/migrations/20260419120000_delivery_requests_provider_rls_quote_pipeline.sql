-- Allow delivery providers to SELECT/UPDATE delivery_requests in the admin quote → Paystack pipeline
-- so paid jobs ("delivery_quote_paid") appear on the delivery dashboard and can be accepted.
-- Prior policies only exposed pending/requested/assigned, which hid quote-paid rows from RLS.

DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  status IN (
    'pending',
    'requested',
    'assigned',
    'quoted',
    'quote_accepted',
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
    'quoted',
    'quote_accepted',
    'delivery_quote_paid'
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests IS
  'Providers see open jobs including quoted / quote_accepted / delivery_quote_paid (builder paid admin quote).';
