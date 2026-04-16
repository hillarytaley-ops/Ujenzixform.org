-- =========================================================================
-- Remove the "Film Coated Residential Steel Entrance Door" Alerts card
-- (delivery address contains "project one" + "Eldoret", film-coated door)
-- =========================================================================
-- This does NOT delete purchase orders. It sets matching delivery_requests
-- to rejected so they disappear from the delivery provider Alerts list.
--
-- Preview (optional, run first in SQL Editor):
--   SELECT id, status, material_type, delivery_address, estimated_cost, created_at
--   FROM delivery_requests
--   WHERE status IN ('pending', 'requested', 'assigned')
--     AND delivery_address ILIKE '%eldoret%'
--     AND delivery_address ILIKE '%project%one%'
--     AND material_type ILIKE '%steel entrance door%';
-- =========================================================================

DO $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE delivery_requests dr
  SET
    status = 'rejected',
    rejection_reason = 'Removed via migration 20260428103000 (Film Coated door / project one Eldoret alert cleanup)',
    rejected_at = COALESCE(dr.rejected_at, NOW()),
    updated_at = NOW()
  WHERE dr.status IN ('pending', 'requested', 'assigned')
    AND dr.delivery_address IS NOT NULL
    AND dr.delivery_address ILIKE '%eldoret%'
    AND dr.delivery_address ILIKE '%project%one%'
    AND dr.material_type IS NOT NULL
    AND (
      dr.material_type ILIKE '%film coated%residential steel entrance door%'
      OR dr.material_type ILIKE '%residential steel entrance door%'
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Rejected % delivery_request row(s) matching Film Coated / project one Eldoret card.', n;
END $$;
