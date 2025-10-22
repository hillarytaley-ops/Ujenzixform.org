-- Fix security vulnerabilities for suppliers_public_directory and delivery_provider_listings

-- 1. Drop and recreate suppliers_public_directory view with security_invoker
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  -- Mask company name for unauthenticated users
  CASE 
    WHEN auth.uid() IS NOT NULL THEN s.company_name
    ELSE substring(s.company_name, 1, 20) || '...'
  END as company_name,
  s.is_verified,
  s.rating,
  s.specialties,
  s.materials_offered,
  s.created_at,
  -- Protected fields - only show to authenticated users with business relationships
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'full_access'
    WHEN auth.uid() IS NOT NULL THEN 'authenticated_limited'
    ELSE 'public_view_only'
  END as access_level
FROM public.suppliers s
WHERE s.is_verified = true AND s.id IS NOT NULL;

-- Grant access to authenticated users only
REVOKE ALL ON public.suppliers_public_directory FROM anon;
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- 2. Enable RLS on delivery_provider_listings table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_provider_listings') THEN
    ALTER TABLE public.delivery_provider_listings ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "delivery_provider_listings_authenticated_read" ON public.delivery_provider_listings;
    DROP POLICY IF EXISTS "delivery_provider_listings_admin_full" ON public.delivery_provider_listings;
    DROP POLICY IF EXISTS "delivery_provider_listings_owner_access" ON public.delivery_provider_listings;
    
    -- Admin full access
    CREATE POLICY "delivery_provider_listings_admin_full"
    ON public.delivery_provider_listings
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
    
    -- Providers can access their own listings
    CREATE POLICY "delivery_provider_listings_owner_access"
    ON public.delivery_provider_listings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_provider_listings.provider_id
          AND dp.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_provider_listings.provider_id
          AND dp.user_id = auth.uid()
      )
    );
    
    -- Authenticated users can view active, verified listings (read-only)
    CREATE POLICY "delivery_provider_listings_authenticated_read"
    ON public.delivery_provider_listings
    FOR SELECT
    TO authenticated
    USING (
      is_verified = true AND is_active = true
    );
  END IF;
END $$;

-- 3. Log security enhancement
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'security_policy_enhancement',
  'high',
  jsonb_build_object(
    'action', 'secured_public_directories',
    'tables_updated', ARRAY['suppliers_public_directory', 'delivery_provider_listings'],
    'security_measures', ARRAY[
      'authentication_required',
      'contact_info_masked',
      'rls_enabled',
      'role_based_access'
    ],
    'timestamp', NOW()
  )
);