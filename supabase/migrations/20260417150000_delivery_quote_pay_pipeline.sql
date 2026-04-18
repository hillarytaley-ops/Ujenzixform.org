-- Builder delivery quote → accept/reject → Paystack → paid → admin alerts providers
-- Statuses: pending → quoted → quote_accepted → delivery_quote_paid → assigned / …

ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS delivery_quote_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_quote_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_quote_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_quote_paystack_reference TEXT;

ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2);

COMMENT ON COLUMN public.delivery_requests.delivery_quote_notes IS 'Admin delivery quote details shown to the builder.';
COMMENT ON COLUMN public.delivery_requests.delivery_quote_sent_at IS 'When the admin last sent or updated the delivery quote.';
COMMENT ON COLUMN public.delivery_requests.delivery_quote_paid_at IS 'When the builder completed Paystack payment for the quoted delivery.';
COMMENT ON COLUMN public.delivery_requests.delivery_quote_paystack_reference IS 'Paystack transaction reference for delivery quote payment.';

-- Expand “active” rows for duplicate prevention (quote pipeline holds the PO slot)
DROP INDEX IF EXISTS idx_unique_delivery_request_by_po_id;
CREATE UNIQUE INDEX idx_unique_delivery_request_by_po_id
ON public.delivery_requests (purchase_order_id)
WHERE purchase_order_id IS NOT NULL
  AND status IN (
    'pending',
    'assigned',
    'requested',
    'quoted',
    'quote_accepted',
    'delivery_quote_paid'
  );

DROP INDEX IF EXISTS idx_unique_delivery_request_by_composite_key;
CREATE UNIQUE INDEX idx_unique_delivery_request_by_composite_key
ON public.delivery_requests (
  LOWER(TRIM(delivery_address)),
  normalize_material_type_for_index(material_type)
)
WHERE purchase_order_id IS NULL
  AND status IN (
    'pending',
    'assigned',
    'requested',
    'quoted',
    'quote_accepted',
    'delivery_quote_paid'
  )
  AND delivery_address IS NOT NULL
  AND material_type IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_delivery_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count INTEGER;
  normalized_address TEXT;
  normalized_material TEXT;
BEGIN
  normalized_address := LOWER(TRIM(NEW.delivery_address));
  normalized_material := normalize_material_type_for_index(NEW.material_type);

  IF NEW.status IN (
    'pending',
    'assigned',
    'requested',
    'quoted',
    'quote_accepted',
    'delivery_quote_paid'
  ) THEN
    IF NEW.purchase_order_id IS NOT NULL THEN
      SELECT COUNT(*) INTO existing_count
      FROM delivery_requests
      WHERE purchase_order_id = NEW.purchase_order_id
        AND status IN (
          'pending',
          'assigned',
          'requested',
          'quoted',
          'quote_accepted',
          'delivery_quote_paid'
        )
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

      IF existing_count > 0 THEN
        RAISE EXCEPTION 'Duplicate delivery request: An active delivery request already exists for this purchase order.';
      END IF;
    END IF;

    IF NEW.purchase_order_id IS NULL AND NEW.delivery_address IS NOT NULL AND NEW.material_type IS NOT NULL THEN
      SELECT COUNT(*) INTO existing_count
      FROM delivery_requests
      WHERE purchase_order_id IS NULL
        AND status IN (
          'pending',
          'assigned',
          'requested',
          'quoted',
          'quote_accepted',
          'delivery_quote_paid'
        )
        AND LOWER(TRIM(delivery_address)) = normalized_address
        AND normalize_material_type_for_index(material_type) = normalized_material
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

      IF existing_count > 0 THEN
        RAISE EXCEPTION 'Duplicate delivery request: An active delivery request already exists for this address and material.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
