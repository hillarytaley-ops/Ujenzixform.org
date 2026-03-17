-- ============================================================
-- Reject accepted delivery requests that have fallback "Order-xxx"
-- or missing delivery address — remove them from Schedule app-wide
-- Created: March 20, 2026
--
-- User requirement: Do not show weird order numbers (Order-3729cc1a etc.)
-- on Schedule. If a delivery was accepted by a provider but has no real
-- po_number / missing address, reject it and clear provider_id so it
-- is removed from the entire app (Schedule) and can reappear on Alerts
-- for another provider or builder action.
-- ============================================================

-- Reject delivery_requests that are accepted/assigned but have:
-- (1) order_number like 'Order-%' (fallback format), OR
-- (2) null/empty/placeholder delivery_address
-- Set status = 'rejected', clear provider_id, set rejection_reason.
UPDATE delivery_requests
SET
  status = 'rejected',
  provider_id = NULL,
  rejection_reason = 'Removed: invalid or missing delivery address. Order number or address must be provided before acceptance.',
  updated_at = NOW()
WHERE status IN ('accepted', 'assigned')
  AND (
    (order_number IS NOT NULL AND TRIM(order_number) LIKE 'Order-%')
    OR TRIM(COALESCE(delivery_address, '')) = ''
    OR LOWER(TRIM(COALESCE(delivery_address, ''))) IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 'to be determined',
      'delivery location', 'address not found', 'address not specified by builder',
      'to be confirmed', 'to be confirmed.', 'delivery address missing - contact builder'
    )
  );

-- Log how many were updated (run as separate statement if needed):
-- SELECT COUNT(*) FROM delivery_requests WHERE status = 'rejected' AND rejection_reason LIKE 'Removed: invalid%';
