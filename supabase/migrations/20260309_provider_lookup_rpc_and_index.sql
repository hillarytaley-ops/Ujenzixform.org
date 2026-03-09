-- ============================================================
-- Fix provider lookup timeouts on delivery dashboard
-- 1. Add RPC for fast provider ID lookup (bypasses RLS/network)
-- 2. Ensure index exists on delivery_providers(user_id)
-- Created: March 9, 2026
-- ============================================================

-- Index (idempotent - original may exist from 20241212)
CREATE INDEX IF NOT EXISTS idx_delivery_providers_user_id ON public.delivery_providers(user_id);

-- RPC: Returns delivery_provider.id for the current user (auth.uid())
-- Fast server-side lookup - avoids client-side RLS/join delays
CREATE OR REPLACE FUNCTION public.get_delivery_provider_id_for_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_id_for_user() TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_id_for_user() IS 
  'Fast lookup for delivery_provider.id by auth.uid(). Use instead of direct table query to avoid timeouts.';
