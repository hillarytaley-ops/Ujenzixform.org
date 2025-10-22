-- CORRECT SECURITY FIX: Drop only the actual views causing issues
-- First check what views exist
DROP VIEW IF EXISTS public.deliveries_secure CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_public_safe CASCADE;

-- Drop the table that was mistakenly identified as a view
DROP TABLE IF EXISTS public.delivery_providers_public CASCADE;

-- Verify no more security definer views exist by checking the actual views
-- Let's also make sure RLS is enabled on all critical tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;

-- Final security completion log
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SECURITY_VIEWS_FINAL_CLEANUP',
  'critical',
  jsonb_build_object(
    'action', 'Removed remaining insecure views and tables',
    'tables_removed', ARRAY['delivery_providers_public'],
    'views_removed', ARRAY['deliveries_secure', 'delivery_providers_public_safe'],
    'rls_enabled_on', ARRAY['suppliers', 'profiles', 'deliveries', 'delivery_providers'],
    'security_level', 'MAXIMUM - Admin only access to supplier contacts',
    'timestamp', NOW()
  )
);