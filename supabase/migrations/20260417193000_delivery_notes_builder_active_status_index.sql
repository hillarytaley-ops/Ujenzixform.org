-- Builder DN list + badge queries filter by builder_id and a small set of open workflow statuses.
-- Without a selective index, large delivery_notes tables can hit statement timeout (57014) under RLS.

CREATE INDEX IF NOT EXISTS idx_delivery_notes_builder_active_created_desc
  ON public.delivery_notes (builder_id, created_at DESC)
  WHERE status IN (
    'pending_signature',
    'signed',
    'forwarded_to_supplier',
    'inspection_pending'
  );

COMMENT ON INDEX public.idx_delivery_notes_builder_active_created_desc IS
  'Speeds builder inbox: builder_id + open DN statuses, order by created_at desc (matches dashboard queries).';
