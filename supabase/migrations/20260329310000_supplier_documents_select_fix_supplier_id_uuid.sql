-- invoices.delivery_notes.goods_received_notes typically store supplier_id = public.suppliers.id.
-- Policy "Suppliers can view invoices supplier_id auth uid" (from 20260329210000) incorrectly required
-- supplier_id = auth.uid(), so suppliers saw no invoice rows unless the PO-linked policy matched
-- (and only when purchase_order_id was set). Replace with the same pattern used for GRN updates.

DROP POLICY IF EXISTS "Suppliers can view invoices supplier_id auth uid" ON public.invoices;
DROP POLICY IF EXISTS "Suppliers can view invoices supplier_id row or legacy auth uid" ON public.invoices;

CREATE POLICY "Suppliers can view invoices supplier_id row or legacy auth uid"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
    OR (
      supplier_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.suppliers s2 WHERE s2.user_id = auth.uid())
    )
  );

-- Redundant with older workflow policies when those exist; ensures visibility if only restrictive
-- phase2 GRN SELECT (builder-only) survived without supplier policies on some databases.
DROP POLICY IF EXISTS "Suppliers can view GRNs by supplier row or legacy uid" ON public.goods_received_notes;
CREATE POLICY "Suppliers can view GRNs by supplier row or legacy uid"
  ON public.goods_received_notes FOR SELECT
  TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR (
      supplier_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Suppliers can view delivery notes by supplier row or legacy uid" ON public.delivery_notes;
CREATE POLICY "Suppliers can view delivery notes by supplier row or legacy uid"
  ON public.delivery_notes FOR SELECT
  TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR (
      supplier_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
    )
  );
