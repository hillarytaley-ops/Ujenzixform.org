-- Deploy before shipping client that POST/PATCHes builder_fulfillment_choice (e.g. cart, quote accept).
-- Apply after: 20260407100000_mark_delivery_requested_include_confirmed.sql
--
-- Explicit builder choice: pending | delivery | pickup (removes ambiguity with delivery_required false alone)
-- Plus conservative repair for legacy rows that were flagged for delivery but never got an open delivery_request.

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS builder_fulfillment_choice text NOT NULL DEFAULT 'pending';

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_builder_fulfillment_choice_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_builder_fulfillment_choice_check
  CHECK (builder_fulfillment_choice IN ('pending', 'delivery', 'pickup'));

COMMENT ON COLUMN public.purchase_orders.builder_fulfillment_choice IS
  'Builder intent: pending = not committed; delivery = submitted delivery / legacy delivery_required; pickup = self-collection.';

-- Repair: awaiting builder action but PO marked delivery with no active delivery_request (e.g. old auto-flag + refresh)
UPDATE public.purchase_orders po
SET
  delivery_required = false,
  builder_fulfillment_choice = 'pending',
  updated_at = NOW()
WHERE po.status = 'awaiting_delivery_request'
  AND po.delivery_required = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.delivery_requests dr
    WHERE dr.purchase_order_id = po.id
      AND COALESCE(lower(dr.status), '') NOT IN (
        'cancelled',
        'rejected',
        'completed',
        'delivered',
        'failed'
      )
  );

-- Align choice with current delivery_required after repair
UPDATE public.purchase_orders
SET builder_fulfillment_choice = 'delivery', updated_at = NOW()
WHERE delivery_required = true;

-- Remaining rows keep default pending or explicit values from above
