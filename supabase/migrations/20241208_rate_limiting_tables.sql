-- =============================================================================
-- Migration: Create Rate Limiting Tables
-- Date: 2024-12-08
-- Description: Server-side rate limiting for security
-- =============================================================================

-- Table to track rate limit requests
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast lookups
  CONSTRAINT rate_limit_requests_key_created_idx UNIQUE (key, created_at)
);

-- Table to track blocked identifiers
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  blocked_until BIGINT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_key ON rate_limit_requests(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_created ON rate_limit_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_key ON rate_limit_blocks(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_until ON rate_limit_blocks(blocked_until);

-- Enable RLS
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables
CREATE POLICY "Service role only - requests" ON rate_limit_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - blocks" ON rate_limit_blocks
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up old rate limit data (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_data()
RETURNS void AS $$
BEGIN
  -- Delete requests older than 24 hours
  DELETE FROM rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete expired blocks
  DELETE FROM rate_limit_blocks
  WHERE blocked_until < EXTRACT(EPOCH FROM NOW()) * 1000;
  
  RAISE NOTICE 'Rate limit data cleaned up';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_rate_limit_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rate_limit_blocks_updated_at
  BEFORE UPDATE ON rate_limit_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limit_blocks_updated_at();

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_data() TO service_role;

SELECT 'Rate limiting tables created successfully!' as status;




