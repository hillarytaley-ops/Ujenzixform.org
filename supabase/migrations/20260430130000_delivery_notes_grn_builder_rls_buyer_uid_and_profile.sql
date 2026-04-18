-- Fix HTTP 500 / empty lists for builders when purchase_orders.buyer_id is auth.uid()
-- but delivery_notes_buyer_view only matched po.buyer_id = profiles.id (JOIN profiles on buyer_id).
-- Align with invoices migration 20260429140000_invoices_builder_rls_profile_and_po_buyer.sql.

-- ---------------------------------------------------------------------------
-- delivery_notes: SELECT for buyer-linked rows + direct builder_id match
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "delivery_notes_buyer_view" ON public.delivery_notes;

CREATE POLICY "delivery_notes_buyer_view"
ON public.delivery_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = delivery_notes.purchase_order_id
      AND (
        po.buyer_id = auth.uid()
        OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
      )
  )
  OR delivery_notes.builder_id = auth.uid()
  OR delivery_notes.builder_id IN (SELECT p3.id FROM public.profiles p3 WHERE p3.user_id = auth.uid())
);

COMMENT ON POLICY "delivery_notes_buyer_view" ON public.delivery_notes IS
  'Builder SELECT: PO buyer is auth uid or profile id, or delivery_notes.builder_id matches either.';

-- Builders need UPDATE (sign / inspection) — hardening left only admin FOR ALL.
DROP POLICY IF EXISTS "delivery_notes_builder_update" ON public.delivery_notes;
CREATE POLICY "delivery_notes_builder_update"
ON public.delivery_notes FOR UPDATE
TO authenticated
USING (
  delivery_notes.builder_id = auth.uid()
  OR delivery_notes.builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = delivery_notes.purchase_order_id
      AND (
        po.buyer_id = auth.uid()
        OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
      )
  )
)
WITH CHECK (
  delivery_notes.builder_id = auth.uid()
  OR delivery_notes.builder_id IN (SELECT p3.id FROM public.profiles p3 WHERE p3.user_id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = delivery_notes.purchase_order_id
      AND (
        po.buyer_id = auth.uid()
        OR po.buyer_id IN (SELECT p4.id FROM public.profiles p4 WHERE p4.user_id = auth.uid())
      )
  )
);

COMMENT ON POLICY "delivery_notes_builder_update" ON public.delivery_notes IS
  'Builder UPDATE (sign/inspect): same ownership as buyer_view SELECT.';

-- ---------------------------------------------------------------------------
-- goods_received_notes: builder_id may be profiles.id (same as DN / invoices)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "goods_received_notes_select" ON public.goods_received_notes;
CREATE POLICY "goods_received_notes_select"
ON public.goods_received_notes FOR SELECT
TO authenticated
USING (
  builder_id = auth.uid()
  OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR is_admin()
);

DROP POLICY IF EXISTS "goods_received_notes_update" ON public.goods_received_notes;
CREATE POLICY "goods_received_notes_update"
ON public.goods_received_notes FOR UPDATE
TO authenticated
USING (
  builder_id = auth.uid()
  OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR is_admin()
)
WITH CHECK (
  builder_id = auth.uid()
  OR builder_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
  OR is_admin()
);

DROP POLICY IF EXISTS "goods_received_notes_insert" ON public.goods_received_notes;
CREATE POLICY "goods_received_notes_insert"
ON public.goods_received_notes FOR INSERT
TO authenticated
WITH CHECK (
  builder_id = auth.uid()
  OR builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR is_admin()
);

COMMENT ON POLICY "goods_received_notes_select" ON public.goods_received_notes IS
  'Builder GRN list: builder_id may be auth.uid() or profiles.id for this user.';
