-- ============================================================
-- Fix: receiving scan fails with purchase_orders_status_check
--
-- Trigger update_order_status_from_items() sets status = 'partially_delivered'
-- when some (not all) material_items are receive_scanned — but 20260227 constraint
-- omitted that value → "violates check constraint purchase_orders_status_check".
--
-- record_qr_scan (20260427) still sets status = 'shipped' on dispatch; 'shipped'
-- is also not in the constraint — add both for compatibility.
-- ============================================================

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
CHECK (status IN (
    'quote_created',
    'quote_received_by_supplier',
    'quote_responded',
    'quote_revised',
    'quote_viewed_by_builder',
    'quote_accepted',
    'quote_rejected',
    'order_created',
    'awaiting_delivery_request',
    'delivery_requested',
    'awaiting_delivery_provider',
    'delivery_assigned',
    'ready_for_dispatch',
    'dispatched',
    'in_transit',
    'delivery_arrived',
    'received',
    'completed',
    'delivery_cancelled',
    'order_cancelled',
    'delivery_failed',
    'rescheduled_delivery',
    'supplier_delay',
    'provider_unavailable',
    'pending',
    'quoted',
    'confirmed',
    'approved',
    'rejected',
    'cancelled',
    'processing',
    'partially_dispatched',
    'partially_delivered',
    'delivered',
    'verified',
    'shipped'
));

COMMENT ON CONSTRAINT purchase_orders_status_check ON purchase_orders IS
  'Allowed PO statuses; includes partially_delivered (trigger on partial receive) and shipped (legacy record_qr_scan dispatch).';
