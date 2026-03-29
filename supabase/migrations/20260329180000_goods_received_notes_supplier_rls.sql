-- 20260110 RLS on goods_received_notes only allowed builders/admins; suppliers lost access to their GRNs.
-- Add explicit supplier policies (combined with existing policies via OR).

DROP POLICY IF EXISTS "goods_received_notes_supplier_select" ON public.goods_received_notes;
CREATE POLICY "goods_received_notes_supplier_select"
  ON public.goods_received_notes FOR SELECT
  TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "goods_received_notes_supplier_update" ON public.goods_received_notes;
CREATE POLICY "goods_received_notes_supplier_update"
  ON public.goods_received_notes FOR UPDATE
  TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );
