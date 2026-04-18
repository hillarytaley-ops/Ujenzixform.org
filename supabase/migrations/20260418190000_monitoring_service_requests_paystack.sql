-- Paystack settlement for monitoring packages: store reference, paid time, and a pre-pay status.

ALTER TABLE public.monitoring_service_requests
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.monitoring_service_requests
  DROP CONSTRAINT IF EXISTS monitoring_service_requests_status_check;

ALTER TABLE public.monitoring_service_requests
  ADD CONSTRAINT monitoring_service_requests_status_check
  CHECK (
    status IN (
      'pending',
      'pending_payment',
      'reviewing',
      'quoted',
      'approved',
      'active',
      'rejected',
      'completed',
      'cancelled',
      'in_progress'
    )
  );

COMMENT ON COLUMN public.monitoring_service_requests.paystack_reference IS 'Paystack transaction reference when the builder paid for a monitoring package.';
COMMENT ON COLUMN public.monitoring_service_requests.paid_at IS 'When Paystack confirmed payment for this monitoring request.';
