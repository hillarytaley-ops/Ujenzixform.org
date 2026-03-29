-- Supplier visibility for delivery_notes / GRNs / invoices when document.supplier_id does not match
-- suppliers.id or auth.uid() but the linked purchase_order still belongs to this supplier.
-- Idempotent: safe to re-run in SQL editor after a partial apply.

DROP POLICY IF EXISTS "Suppliers can view delivery notes for their purchase orders" ON delivery_notes;
DROP POLICY IF EXISTS "Suppliers can view GRNs for their purchase orders" ON goods_received_notes;
DROP POLICY IF EXISTS "Suppliers can view invoices for their purchase orders" ON invoices;
DROP POLICY IF EXISTS "Suppliers can view invoices supplier_id auth uid" ON invoices;
DROP POLICY IF EXISTS "Suppliers can update GRNs they can view" ON goods_received_notes;

CREATE POLICY "Suppliers can view delivery notes for their purchase orders"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    purchase_order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = delivery_notes.purchase_order_id
      AND (
        po.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
        OR po.supplier_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can view GRNs for their purchase orders"
  ON goods_received_notes FOR SELECT
  TO authenticated
  USING (
    purchase_order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = goods_received_notes.purchase_order_id
      AND (
        po.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
        OR po.supplier_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can view invoices for their purchase orders"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    purchase_order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = invoices.purchase_order_id
      AND (
        po.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
        OR po.supplier_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can view invoices supplier_id auth uid"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    supplier_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
  );

-- Mark GRN viewed (supplier workflow): phase2 policy only allowed builder/admin updates.
CREATE POLICY "Suppliers can update GRNs they can view"
  ON goods_received_notes FOR UPDATE
  TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR (
      supplier_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
    )
    OR (
      purchase_order_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = purchase_order_id
        AND (
          po.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
          OR po.supplier_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR (
      supplier_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = auth.uid())
    )
    OR (
      purchase_order_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = purchase_order_id
        AND (
          po.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
          OR po.supplier_id = auth.uid()
        )
      )
    )
  );
