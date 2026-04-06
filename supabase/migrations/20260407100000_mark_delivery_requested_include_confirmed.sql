-- Allow mark_delivery_requested to advance PO status when quote flow ends in `confirmed`
-- (PurchaseOrderManager / QuoteComparison) as well as awaiting_delivery_request / order_created.

CREATE OR REPLACE FUNCTION public.mark_delivery_requested(po_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.purchase_orders
  SET
    status = CASE
      WHEN status = 'awaiting_delivery_request' THEN 'delivery_requested'
      WHEN status = 'order_created' THEN 'delivery_requested'
      WHEN status = 'confirmed' THEN 'delivery_requested'
      ELSE status
    END,
    delivery_requested_at = CASE
      WHEN delivery_requested_at IS NULL
        AND status IN ('awaiting_delivery_request', 'order_created', 'confirmed')
      THEN NOW()
      ELSE delivery_requested_at
    END,
    updated_at = NOW()
  WHERE id = po_id
    AND status IN ('awaiting_delivery_request', 'order_created', 'confirmed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_delivery_requested(UUID) TO authenticated;
