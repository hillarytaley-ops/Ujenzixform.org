-- ============================================================
-- CHECK: Indexes on delivery_requests and create if missing
-- ============================================================

-- Check existing indexes
SELECT 
  'Existing Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'delivery_requests'
  AND schemaname = 'public'
ORDER BY indexname;

-- Create indexes if they don't exist (these are critical for the RPC function)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_id_status 
ON delivery_requests(provider_id, status) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_delivery_requests_updated_at 
ON delivery_requests(updated_at DESC NULLS LAST);

-- Verify indexes were created
SELECT 
  'Indexes Created' as check_type,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'delivery_requests'
  AND schemaname = 'public'
  AND indexname LIKE 'idx_delivery_requests%';
