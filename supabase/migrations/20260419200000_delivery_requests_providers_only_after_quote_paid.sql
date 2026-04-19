-- Delivery providers must NOT see or list open-market jobs until the builder has paid
-- the admin delivery quote (status = delivery_quote_paid). Prior policy still showed
-- pending/requested/assigned rows and client code could notify drivers before payment.

DROP POLICY IF EXISTS "delivery_requests_provider_view_pending" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON public.delivery_requests;

CREATE POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  status = 'delivery_quote_paid'
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
    'delivery_quote_paid',
    'accepted',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'scheduled'
  )
  OR provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
  OR provider_id = auth.uid()
  OR builder_id = auth.uid()
  OR builder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "delivery_requests_provider_view_pending" ON public.delivery_requests IS
  'Unassigned jobs: providers only see delivery_quote_paid. Assigned rows visible via provider_id / builder branches.';
