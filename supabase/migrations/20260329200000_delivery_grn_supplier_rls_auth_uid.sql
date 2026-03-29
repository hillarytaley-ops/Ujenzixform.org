-- Some flows store the supplier's auth user id in purchase_orders.supplier_id (and thus on
-- delivery_notes / goods_received_notes). Existing policies only matched suppliers.id.
-- Allow SELECT when supplier_id = auth.uid() for users who have a supplier row.

CREATE POLICY "Suppliers can view delivery notes supplier_id auth uid"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    supplier_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
  );

CREATE POLICY "Suppliers can view GRNs supplier_id auth uid"
  ON goods_received_notes FOR SELECT
  TO authenticated
  USING (
    supplier_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
  );
