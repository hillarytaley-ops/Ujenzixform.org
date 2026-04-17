-- Professional builders often have invoices.builder_id or purchase_orders.buyer_id set to
-- profiles.id (dashboard profile row) instead of auth.uid(). Previous policies only matched
-- auth.uid(), so acknowledge + payment updates failed silently from the builder's perspective
-- ("Pay now" appeared to do nothing). Align with patterns used on delivery_orders / quotation_requests.

DROP POLICY IF EXISTS "Builders can view own invoices" ON public.invoices;
CREATE POLICY "Builders can view own invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    OR (
      purchase_order_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = invoices.purchase_order_id
          AND (
            po.buyer_id = auth.uid()
            OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
          )
      )
    )
  );

DROP POLICY IF EXISTS "Builders can acknowledge own invoices" ON public.invoices;
CREATE POLICY "Builders can acknowledge own invoices"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    OR (
      purchase_order_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = invoices.purchase_order_id
          AND (
            po.buyer_id = auth.uid()
            OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
          )
      )
    )
  )
  WITH CHECK (
    builder_id = auth.uid()
    OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    OR (
      purchase_order_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = invoices.purchase_order_id
          AND (
            po.buyer_id = auth.uid()
            OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
          )
      )
    )
  );

COMMENT ON POLICY "Builders can view own invoices" ON public.invoices IS
  'Builder sees invoices where builder_id matches auth uid or their profile id, or PO buyer matches either.';

COMMENT ON POLICY "Builders can acknowledge own invoices" ON public.invoices IS
  'Builder may update (acknowledge / pay metadata) when linked as above — same predicate for WITH CHECK.';
