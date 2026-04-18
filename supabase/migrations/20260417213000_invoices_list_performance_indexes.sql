-- Speed builder invoice hub: eq(builder_id), eq(buyer_id) on PO, and invoice by purchase_order_id.

CREATE INDEX IF NOT EXISTS idx_invoices_builder_id_created_desc
  ON public.invoices (builder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_purchase_order_id_created_desc
  ON public.invoices (purchase_order_id, created_at DESC)
  WHERE purchase_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_buyer_id_created_desc
  ON public.purchase_orders (buyer_id, created_at DESC)
  WHERE buyer_id IS NOT NULL;

COMMENT ON INDEX public.idx_invoices_builder_id_created_desc IS
  'Builder dashboard: list invoices by builder_id ordered by created_at.';
