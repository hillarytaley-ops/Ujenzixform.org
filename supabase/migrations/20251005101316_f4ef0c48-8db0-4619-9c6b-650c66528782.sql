-- ============================================
-- FIX: Add security_invoker to suppliers_public_directory view
-- This ensures the view respects RLS and runs with invoker privileges
-- ============================================

DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory
WITH (security_invoker = on, security_barrier = true)
AS
SELECT 
  s.id,
  s.company_name,
  s.specialties,
  s.materials_offered,
  s.rating,
  s.is_verified,
  s.created_at,
  s.updated_at,
  'Contact info protected - use secure request'::TEXT as contact_status
FROM suppliers s
WHERE s.is_verified = true
  AND auth.uid() IS NOT NULL;

-- Ensure proper grants
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.suppliers_public_directory FROM anon;
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Supplier directory view secured with security_invoker=on';
  RAISE NOTICE '  - Runs with calling user privileges (not creator)';
  RAISE NOTICE '  - Respects RLS policies';
  RAISE NOTICE '  - Authentication required via auth.uid() check';
END $$;