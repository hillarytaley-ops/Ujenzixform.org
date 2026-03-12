-- Allow suppliers to read delivery_requests for purchase_orders they supply
-- so the supplier dashboard can show "Delivery assigned" when a provider has accepted
CREATE POLICY "delivery_requests_supplier_read_own_po"
ON public.delivery_requests
FOR SELECT TO authenticated
USING (
  purchase_order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = delivery_requests.purchase_order_id
      AND (
        po.supplier_id = auth.uid()
        OR po.supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
      )
  )
);

COMMENT ON POLICY "delivery_requests_supplier_read_own_po" ON public.delivery_requests IS
  'Suppliers can read delivery_requests for their purchase_orders so the Orders tab shows provider-assigned status.';
