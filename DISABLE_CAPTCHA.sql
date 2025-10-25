-- ============================================
-- DISABLE CAPTCHA IN SUPABASE
-- ============================================
-- Run this in Supabase SQL Editor if you can't
-- find the CAPTCHA toggle in the dashboard
-- ============================================

-- Method 1: Disable CAPTCHA for email auth
UPDATE auth.config 
SET value = 'false'::jsonb
WHERE parameter = 'security_captcha_enabled';

-- Method 2: Check current CAPTCHA settings
SELECT * FROM auth.config WHERE parameter LIKE '%captcha%';

-- Method 3: Verify it's disabled
SELECT 
  parameter,
  value,
  CASE 
    WHEN value::text = 'true' THEN '❌ ENABLED (needs to be disabled)'
    WHEN value::text = 'false' THEN '✅ DISABLED (good!)'
    ELSE value::text
  END as status
FROM auth.config 
WHERE parameter LIKE '%captcha%';

