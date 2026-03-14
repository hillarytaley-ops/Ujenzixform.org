-- ============================================================
-- CRITICAL: Delete all delivery_requests without valid delivery_address
-- This ensures only delivery requests with actual addresses are shown to providers
-- Created: March 14, 2026
-- ============================================================

-- Delete all delivery_requests that don't have a valid delivery_address
-- Valid means: not null, not empty, and not "To be provided" or similar placeholder text

DELETE FROM delivery_requests
WHERE 
  -- No delivery_address at all
  (delivery_address IS NULL OR delivery_address = '' OR TRIM(delivery_address) = '')
  -- OR delivery_address is a placeholder
  OR LOWER(TRIM(delivery_address)) IN ('to be provided', 'tbd', 'n/a', 'na', 'tba', 'to be determined')
  -- OR delivery_location is also null/empty (if delivery_address is missing, check delivery_location)
  OR (delivery_address IS NULL AND (delivery_location IS NULL OR delivery_location = '' OR TRIM(delivery_location) = ''))
  -- OR delivery_location is a placeholder
  OR (delivery_address IS NULL AND LOWER(TRIM(delivery_location)) IN ('to be provided', 'tbd', 'n/a', 'na', 'tba', 'to be determined'));

-- Log the deletion
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % delivery_requests without valid delivery_address', deleted_count;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================
