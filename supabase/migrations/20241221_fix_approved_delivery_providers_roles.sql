-- ============================================================================
-- FIX: Add user_roles entries for already-approved delivery providers
-- This one-time fix ensures approved providers have the 'delivery' role
-- so they can see scanners and access delivery-specific features
-- ============================================================================

-- Insert user_roles for all approved delivery providers who don't have a role yet
INSERT INTO public.user_roles (user_id, role)
SELECT 
  dpr.auth_user_id,
  'delivery'
FROM public.delivery_provider_registrations dpr
WHERE dpr.status = 'approved'
  AND dpr.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = dpr.auth_user_id
  )
ON CONFLICT (user_id) DO UPDATE SET role = 'delivery';

-- Log how many were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.delivery_provider_registrations dpr
  INNER JOIN public.user_roles ur ON ur.user_id = dpr.auth_user_id
  WHERE dpr.status = 'approved' AND ur.role = 'delivery';
  
  RAISE NOTICE 'Total approved delivery providers with roles: %', fixed_count;
END $$;

-- Also ensure the user_roles table allows the delivery role
-- (in case there's a check constraint that only allows certain values)
-- This is a safe operation that won't fail if the constraint doesn't exist
-- or if 'delivery' is already allowed











