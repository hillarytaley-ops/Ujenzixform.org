-- Allow suppliers to read builder signatures for delivery notes they own.
-- Older policies compared dn.supplier_id to profiles.id; delivery_notes.supplier_id
-- references public.suppliers.id, so suppliers always hit "permission denied".

DROP POLICY IF EXISTS "delivery_note_signatures_supplier_select_own_dn" ON public.delivery_note_signatures;

CREATE POLICY "delivery_note_signatures_supplier_select_own_dn"
ON public.delivery_note_signatures FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.delivery_notes dn
    WHERE dn.id = delivery_note_signatures.delivery_note_id
    AND (
      dn.supplier_id = auth.uid()
      OR public.supplier_row_owned_by_caller(dn.supplier_id)
    )
  )
);

COMMENT ON POLICY "delivery_note_signatures_supplier_select_own_dn" ON public.delivery_note_signatures IS
  'Supplier dashboard: read signature rows for DNs where supplier_id is the supplier row (or legacy auth uid).';
